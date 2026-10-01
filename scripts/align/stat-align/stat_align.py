"""Alinhador estatístico (sem IA): liga cada palavra da Bíblia Livre a um número de Strong.

IBM Model 1 (5 iterações) + Model 2 com prior diagonal estilo fast_align (5 iterações),
treinado no Novo Testamento inteiro (work/nt/*.json, de fetch-nt.mjs). Não usa IA.
Melhorias da rodada 2, cada uma ligável por flag:
  --stem        radical RSLP (rslp.py) no lado português
  --sym         fwd (só PT->Strong, rodada 1) | inter | gd (grow-diag) | gdfa (grow-diag-final-and):
                treina os dois sentidos e combina as ligações por posição
  --seed N      capítulos 1..N do gabarito de João viram semente: nesses versículos o
                alinhamento é fixado no gabarito, com peso --weight (nunca avalie nesses capítulos)
  --tune A-B    tabela de variante x limiar medida nos capítulos A-B (disjuntos da semente)
  --eval A-B    mede os capítulos A-B com --sym/--tau
  --write       grava work/jhn-NN.align.stat.json (formato do validate-alignment.mjs)

Uso (da raiz do repo): python scripts/align/stat-align/stat_align.py --stem --sym gdfa --seed 10 --tau 0.4 --eval 11-21 --write
Eflomal não instala no Windows (precisa de make + compilador C); por isso este Model 2 próprio.
"""
import argparse, glob, json, os, re, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rslp import stem as rslp_stem

ROOT = "scripts/align/work"
WORD = re.compile(r"[^\W_]+(?:['’\-][^\W_]+)*")
ARTICLE = "G3588"
NEIGHBORS = [(-1, 0), (0, -1), (1, 0), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]


# ---------- dados ----------
def load(use_stem):
    """Versículos do NT: dict com texto, palavras (início, fim, radical) e Strong."""
    verses, cache = [], {}
    for f in sorted(glob.glob(f"{ROOT}/nt/*.json")):
        d = json.load(open(f, encoding="utf8"))
        for v in d["verses"]:
            ws = []
            for m in WORD.finditer(v["pt"]):
                w = m.group().lower()
                ws.append((m.start(), m.end(), cache.setdefault(w, rslp_stem(w)) if use_stem else w))
            verses.append({"book": d["book"], "ch": d["chapter"], "v": v["verse"], "pt": v["pt"], "ws": ws,
                           "strongs": [g["s"] for g in v["greek"] if g["s"]]})
    return verses


def load_gold(path=f"{ROOT}/tagged-john.tsv"):
    """(cap, verso) -> {início da palavra: Strong do trecho onde ela começa}."""
    raw = {}
    for line in open(path, encoding="utf8").read().split("\n")[1:]:
        if not line:
            continue
        _, _, ch, v, _, text, strong = (line.split("\t") + [""])[:7]
        e = raw.setdefault((int(ch), int(v)), {"text": "", "marks": []})
        e["marks"].append((len(e["text"]), strong or None))
        e["text"] += text
    gold = {}
    for k, e in raw.items():
        marks, out = e["marks"], {}
        for m in WORD.finditer(e["text"]):
            s = None
            for frm, st in marks:
                if frm <= m.start():
                    s = st
                else:
                    break
            out[m.start()] = s
        gold[k] = (e["text"], out)
    return gold


# ---------- treino ----------
def build(src_l, tgt_l, allow_l, seeded, lam, p0):
    """Pares (fonte, alvo) de todos os versículos; cada alvo tem NULL + as fontes do versículo."""
    E, F, T, D, C, K, V, W = [], [], [], [], [], [], [], []
    tbase = 0
    for v, (src, tgt, allow) in enumerate(zip(src_l, tgt_l, allow_l)):
        n, m = len(src), len(tgt)
        if m == 0:
            continue
        if n:
            ii = np.arange(1, n + 1) / n
            jj = (np.arange(m) + 1) / m
            raw = np.exp(-lam * np.abs(ii[None, :] - jj[:, None]))
            d = np.empty((m, n + 1))
            d[:, 0] = p0
            d[:, 1:] = (1 - p0) * raw / raw.sum(1, keepdims=True)
        else:
            d = np.ones((m, 1))
        if allow is not None:  # semente: só os pares do gabarito; sem par, só NULL
            mask = np.zeros((m, n + 1))
            if n:
                mask[:, 1:] = allow.T
            mask[:, 0] = ~allow.any(0) if n else 1.0
            d = d * mask
        E.append(np.tile(np.r_[0, src], m)); F.append(np.repeat(tgt, n + 1))
        T.append(np.repeat(tbase + np.arange(m), n + 1)); D.append(d.ravel())
        C.append(np.tile(np.arange(n + 1), m)); K.append(np.repeat(np.arange(m), n + 1))
        V.append(np.full(m * (n + 1), v)); W.append(np.full(m, seeded[v]))
        tbase += m
    cat = lambda a, dt: np.concatenate(a).astype(dt)
    return (cat(E, np.int64), cat(F, np.int64), cat(T, np.int64), cat(D, float), cat(C, np.int32),
            cat(K, np.int32), cat(V, np.int32), cat(W, float))


def em(arrs, nf, m1, m2):
    E, F, T, D, C, K, V, WT = arrs
    uniq, u = np.unique(E * nf + F, return_inverse=True)
    e_of_u = uniq // nf
    t = 1.0 / np.bincount(e_of_u)[e_of_u]
    flat = (D > 0).astype(float)  # Model 1: sem prior de posição, mas respeitando a semente
    post = None
    for it in range(m1 + m2 + 1):
        w = t[u] * (D if it >= m1 else flat)
        post = w / np.maximum(np.bincount(T, weights=w)[T], 1e-300)
        if it == m1 + m2:
            break
        cnt = np.bincount(u, weights=post * WT[T], minlength=len(uniq))
        tot = np.bincount(e_of_u, weights=cnt)[e_of_u]
        t = np.where(tot > 0, cnt / np.maximum(tot, 1e-300), 0.0)
    return post


def viterbi(T, C, post):
    """Melhor candidato (0 = NULL) de cada palavra-alvo."""
    starts = np.r_[0, np.flatnonzero(T[1:] != T[:-1]) + 1]
    best = np.maximum.reduceat(post, starts)
    idx = np.flatnonzero(post >= best[T])
    first = idx[np.unique(T[idx], return_index=True)[1]]
    out = np.zeros(T[-1] + 1, dtype=np.int32)
    out[T[first]] = C[first]
    return out


# ---------- combinação dos dois sentidos ----------
def links_for(sym, fwd, rev, n, m):
    """Conjuntos de ligações (i = 1..n grego, j = 0..m-1 português) para a variante pedida."""
    f = {(c, j) for j, c in enumerate(fwd) if c > 0}
    if sym == "fwd":
        return f
    r = {(i + 1, c - 1) for i, c in enumerate(rev) if c > 0}
    inter, union = f & r, f | r
    if sym == "inter":
        return inter
    a = set(inter)
    ai, aj = {i for i, _ in a}, {j for _, j in a}
    changed = True
    while changed:  # grow-diag: vizinhas (inclusive diagonais) da união, se algum lado está livre
        changed = False
        for i, j in sorted(a):
            for di, dj in NEIGHBORS:
                p = (i + di, j + dj)
                if p in union and p not in a and (p[0] not in ai or p[1] not in aj):
                    a.add(p); ai.add(p[0]); aj.add(p[1]); changed = True
    if sym == "gdfa":  # final-and: o que sobrou da união com os dois lados ainda livres
        for p in sorted(union):
            if p not in a and p[0] not in ai and p[1] not in aj:
                a.add(p); ai.add(p[0]); aj.add(p[1])
    return a


# ---------- trechos e avaliação ----------
def spans_for(pt, ws, tags):
    """Palavras com Strong -> trechos. Artigo grego cola na palavra de conteúdo seguinte
    (regra 4 do ALIGN-PROMPT); vizinhas com o mesmo Strong viram um trecho só."""
    out = []
    for (a, b, _), s in zip(ws, tags):
        u = [a, b, s]
        if out and out[-1][2] == ARTICLE and u[2] not in (None, ARTICLE) and pt[out[-1][1]:u[0]].strip() == "":
            u[0] = out.pop()[0]
        if out and u[2] and out[-1][2] == u[2] and pt[out[-1][1]:u[0]].strip() == "":
            out[-1][1] = u[1]
        else:
            out.append(u)
    spans, pos = [], 0
    for a, b, s in out:
        if a > pos:
            spans.append({"t": pt[pos:a], "s": None})
        spans.append({"t": pt[a:b], "s": s})
        pos = b
    if pos < len(pt):
        spans.append({"t": pt[pos:], "s": None})
    return spans


def metrics(pred, gold_words, chapters):
    n_stat = same = diff = gold_linked = 0
    for (ch, v), g in gold_words.items():
        if not chapters[0] <= ch <= chapters[1]:
            continue
        for p, s in zip(pred[(ch, v)], g):
            n_stat += p is not None
            if s:
                gold_linked += 1
                same += p == s
                diff += p is not None and p != s
    return {"prec": same / max(n_stat, 1), "prec_gab": same / max(same + diff, 1),
            "cob": (same + diff) / gold_linked, "conc": same / gold_linked}


def fmt(m):
    return f"precisão estrita {m['prec']:.1%} · nas do gabarito {m['prec_gab']:.1%} · cobertura {m['cob']:.1%} · concordância {m['conc']:.1%}"


def rng(s):
    a, b = s.split("-")
    return int(a), int(b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stem", action="store_true")
    ap.add_argument("--sym", default="fwd", choices=["fwd", "inter", "gd", "gdfa"])
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--weight", type=float, default=5.0)
    ap.add_argument("--tau", type=float, default=0.5)
    ap.add_argument("--lam", type=float, default=4.0)
    ap.add_argument("--p0", type=float, default=0.1)
    ap.add_argument("--m1", type=int, default=5)
    ap.add_argument("--m2", type=int, default=5)
    ap.add_argument("--tune")
    ap.add_argument("--eval")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    for r in (a.tune, a.eval):
        if r and rng(r)[0] <= a.seed:
            sys.exit(f"medir em {r} com semente 1-{a.seed} contamina a nota")

    verses = load(a.stem)
    gold = load_gold()
    sid, wid = {}, {}
    src_l, tgt_l, allow_l, seeded = [], [], [], []
    for x in verses:
        s_ids = np.array([sid.setdefault(s, len(sid) + 1) for s in x["strongs"]], dtype=np.int64)
        w_ids = np.array([wid.setdefault(w[2], len(wid) + 1) for w in x["ws"]], dtype=np.int64)
        x["s_ids"], x["w_ids"] = s_ids, w_ids
        allow = None
        if x["book"] == "JHN" and x["ch"] <= a.seed and (x["ch"], x["v"]) in gold:
            g = gold[(x["ch"], x["v"])][1]
            gl = [g.get(w[0]) for w in x["ws"]]
            allow = np.array([[gs is not None and gs == s for gs in gl] for s in x["strongs"]], dtype=bool).reshape(len(s_ids), len(w_ids))
        x["allow"] = allow
        src_l.append(s_ids); tgt_l.append(w_ids); allow_l.append(allow); seeded.append(a.weight if allow is not None else 1.0)
    ns, nw = len(sid) + 1, len(wid) + 1
    inv = {i: s for s, i in sid.items()}
    nv = len(verses)
    print(f"treino: {nv} versículos, {sum(len(x['ws']) for x in verses)} palavras PT, {len(wid)} radicais/palavras, {len(sid)} Strong"
          f"{', semente 1-' + str(a.seed) if a.seed else ''}", flush=True)

    # sentido PT <- Strong (fonte = Strong, alvo = palavra) e Strong <- PT (fonte = palavra, alvo = Strong)
    fa = build(src_l, tgt_l, allow_l, seeded, a.lam, a.p0)
    fpost = em(fa, nw, a.m1, a.m2)
    fbest = viterbi(fa[2], fa[4], fpost)
    ra = build(tgt_l, src_l, [None if al is None else al.T for al in allow_l], seeded, a.lam, a.p0)
    rpost = em(ra, ns, a.m1, a.m2)
    rbest = viterbi(ra[2], ra[4], rpost)
    print("treino dos dois sentidos pronto", flush=True)

    # posteriores por par (i, j) não-NULL, indexados por versículo: off + j*n + (i-1)
    n_s = np.array([len(x["s_ids"]) for x in verses]); n_w = np.array([len(x["w_ids"]) for x in verses])
    off = np.r_[0, np.cumsum(n_s * n_w)]
    pf = np.zeros(off[-1]); pb = np.zeros(off[-1])
    E, F, T, D, C, K, V, _ = fa
    nn = C > 0
    pf[off[V[nn]] + K[nn].astype(np.int64) * n_s[V[nn]] + C[nn] - 1] = fpost[nn]
    E, F, T, D, C, K, V, _ = ra
    nn = C > 0
    pb[off[V[nn]] + (C[nn].astype(np.int64) - 1) * n_s[V[nn]] + K[nn]] = rpost[nn]
    pt_base = np.r_[0, np.cumsum(n_w)]; gr_base = np.r_[0, np.cumsum(n_s)]

    john = [i for i, x in enumerate(verses) if x["book"] == "JHN"]
    variants = ["fwd", "inter", "gd", "gdfa"]
    best = {sym: {} for sym in variants}  # sym -> (cap, verso) -> [(Strong, nota) por palavra]
    for i in john:
        x = verses[i]
        n, m = n_s[i], n_w[i]
        fw = fbest[pt_base[i]:pt_base[i] + m]
        rv = rbest[gr_base[i]:gr_base[i] + n]
        for sym in variants:
            per = [(None, 0.0)] * m
            for gi, j in links_for(sym, fw, rv, n, m):
                p = off[i] + j * n + gi - 1
                score = pf[p] if sym == "fwd" else float(np.sqrt(pf[p] * pb[p]))
                if score > per[j][1]:
                    per[j] = (inv[int(x["s_ids"][gi - 1])], score)
            best[sym][(x["ch"], x["v"])] = per

    gold_words = {}
    for i in john:
        x = verses[i]
        g = gold[(x["ch"], x["v"])]
        assert g[0] == x["pt"], f"texto do gabarito difere em {x['ch']}:{x['v']}"
        gold_words[(x["ch"], x["v"])] = [g[1].get(w[0]) for w in x["ws"]]

    def preds(sym, tau):
        return {k: [s if sc >= tau else None for s, sc in per] for k, per in best[sym].items()}

    if a.tune:
        ch = rng(a.tune)
        print(f"\ncapítulos {a.tune} (semente 1-{a.seed}, peso {a.weight}, radical {'sim' if a.stem else 'não'})")
        for sym in variants:
            for tau in [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
                print(f"  {sym:5s} tau {tau:.2f}: {fmt(metrics(preds(sym, tau), gold_words, ch))}")
    if a.eval:
        print(f"\ncapítulos {a.eval}, {a.sym}, tau {a.tau}: {fmt(metrics(preds(a.sym, a.tau), gold_words, rng(a.eval)))}")
    if a.write:
        tags = preds(a.sym, a.tau)
        by_ch = {}
        for i in john:
            x = verses[i]
            by_ch.setdefault(x["ch"], []).append({"verse": x["v"], "spans": spans_for(x["pt"], x["ws"], tags[(x["ch"], x["v"])])})
        for ch, arr in by_ch.items():
            with open(f"{ROOT}/jhn-{ch:02d}.align.stat.json", "w", encoding="utf8") as f:
                json.dump(arr, f, ensure_ascii=False)
        print(f"escrevi {len(by_ch)} capítulos de João em {ROOT}/jhn-NN.align.stat.json ({a.sym}, tau {a.tau})")


if __name__ == "__main__":
    main()
