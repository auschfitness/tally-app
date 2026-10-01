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
  --write-nt    grava work/nt/<LIVRO>-NN.align.stat.json do NT inteiro, menos João (só a variante --sym)
  --corpus ot   Antigo Testamento (work/ot, de `fetch-nt.mjs ot`): gabarito = work/ot/*.gold.json,
                semente = --seed-ids (ex. GEN-01,EXO-20), medição (--tune/--eval all) = os demais
                capítulos do gabarito; --write grava work/ot/<LIVRO>-NN.align.stat.json
                (capítulo do gabarito leva o próprio gabarito)

Uso (da raiz do repo): python scripts/align/stat-align/stat_align.py --stem --sym gdfa --seed 10 --tau 0.4 --eval 11-21 --write
Eflomal não instala no Windows (precisa de make + compilador C); por isso este Model 2 próprio.
"""
import argparse, glob, json, os, re, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rslp import stem as rslp_stem

WORK = "scripts/align/work"
WORD = re.compile(r"[^\W_]+(?:['’\-][^\W_]+)*")
ARTICLE = "G3588"
NEIGHBORS = [(-1, 0), (0, -1), (1, 0), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]


# ---------- dados ----------
def load(use_stem, corpus):
    """Versículos do NT/AT: dict com texto, palavras (início, fim, radical) e Strong."""
    verses, cache = [], {}
    for f in sorted(glob.glob(f"{WORK}/{corpus}/*.json")):
        if ".align" in f or ".gold" in f:
            continue
        d = json.load(open(f, encoding="utf8"))
        for v in d["verses"]:
            ws = []
            for m in WORD.finditer(v["pt"]):
                w = m.group().lower()
                ws.append((m.start(), m.end(), cache.setdefault(w, rslp_stem(w)) if use_stem else w))
            verses.append({"book": d["book"], "ch": d["chapter"], "v": v["verse"], "pt": v["pt"], "ws": ws,
                           "strongs": [g["s"] for g in v["greek"] if g["s"]]})
    return verses


def word_tags(text, marks):
    """{início da palavra: Strong do trecho onde ela começa}; marks = [(início do trecho, Strong)]."""
    out = {}
    for m in WORD.finditer(text):
        s = None
        for frm, st in marks:
            if frm <= m.start():
                s = st
            else:
                break
        out[m.start()] = s
    return out


def load_gold_ot():
    """Gabarito do AT: ('GEN', cap, verso) -> (texto, {início da palavra: Strong}) e os trechos crus."""
    gold, spans = {}, {}
    for f in sorted(glob.glob(f"{WORK}/ot/*.gold.json")):
        book, ch = os.path.basename(f)[:-10].split("-")
        for v in json.load(open(f, encoding="utf8")):
            text, marks = "", []
            for sp in v["spans"]:
                marks.append((len(text), sp["s"] or None))
                text += sp["t"]
            k = (book, int(ch), v["verse"])
            gold[k] = (text, word_tags(text, marks))
            spans[k] = v["spans"]
    return gold, spans


def load_gold(path=f"{WORK}/tagged-john.tsv"):
    """('JHN', cap, verso) -> {início da palavra: Strong do trecho onde ela começa}."""
    raw = {}
    for line in open(path, encoding="utf8").read().split("\n")[1:]:
        if not line:
            continue
        _, _, ch, v, _, text, strong = (line.split("\t") + [""])[:7]
        e = raw.setdefault((int(ch), int(v)), {"text": "", "marks": []})
        e["marks"].append((len(e["text"]), strong or None))
        e["text"] += text
    return {("JHN",) + k: (e["text"], word_tags(e["text"], e["marks"])) for k, e in raw.items()}


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


# ---------- palavras de prefixo/sufixo (AT) ----------
# No hebraico "e", artigo, preposição e possessivo são prefixo/sufixo da palavra (וְהָאָרֶץ = "e a terra",
# לִבְּךָ = "teu coração") e têm o Strong dela; o estatístico liga só a palavra de conteúdo.
# --glue cola essas palavrinhas soltas na palavra ligada vizinha (só espaço entre elas).
# "de/do/da" fica de fora: na cadeia de construto ("casa de Deus") é tanto de uma palavra quanto da
# outra, e colar na seguinte errou mais do que acertou no gabarito (medido: 94,6% -> 95,9% nas certas).
GLUE_BEFORE = set("""e o a os as em no na nos nas num numa para pra ao aos à às com por pelo pela
pelos pelas como um uma teu tua teus tuas seu sua seus suas meu minha meus minhas nosso nossa nossos nossas
vosso vossa vossos vossas""".split())
GLUE_AFTER = set("dele dela deles delas".split())


def glue(pt, ws, tags):
    tags = list(tags)
    word = lambda j: pt[ws[j][0]:ws[j][1]].lower()
    touching = lambda j, k: pt[ws[j][1]:ws[k][0]].strip() == ""  # j antes de k, só espaço entre
    for j in range(len(ws) - 2, -1, -1):  # da direita: "e a terra" encadeia
        if tags[j] is None and tags[j + 1] and word(j) in GLUE_BEFORE and touching(j, j + 1):
            tags[j] = tags[j + 1]
    for j in range(1, len(ws)):
        if tags[j] is None and tags[j - 1] and word(j) in GLUE_AFTER and touching(j - 1, j):
            tags[j] = tags[j - 1]
    return tags


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


def metrics(pred, gold_words, keep):
    n_stat = same = diff = gold_linked = 0
    for k, g in gold_words.items():
        if not keep(k):
            continue
        for p, s in zip(pred[k], g):
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
    ap.add_argument("--write-nt", action="store_true")
    ap.add_argument("--corpus", default="nt", choices=["nt", "ot"])
    ap.add_argument("--seed-ids", default="")
    ap.add_argument("--glue", action="store_true")
    a = ap.parse_args()
    ot = a.corpus == "ot"
    for r in (a.tune, a.eval):
        if r and not ot and rng(r)[0] <= a.seed:
            sys.exit(f"medir em {r} com semente 1-{a.seed} contamina a nota")

    verses = load(a.stem, a.corpus)
    gold_spans = {}
    if ot:
        gold, gold_spans = load_gold_ot()
        seed_ids = {tuple(x.split("-")) for x in a.seed_ids.split(",") if x}
        is_seed = lambda k: (k[0], f"{k[1]:02d}") in seed_ids
    else:
        gold = load_gold()
        is_seed = lambda k: k[0] == "JHN" and k[1] <= a.seed
    sid, wid = {}, {}
    src_l, tgt_l, allow_l, seeded = [], [], [], []
    for x in verses:
        s_ids = np.array([sid.setdefault(s, len(sid) + 1) for s in x["strongs"]], dtype=np.int64)
        w_ids = np.array([wid.setdefault(w[2], len(wid) + 1) for w in x["ws"]], dtype=np.int64)
        x["s_ids"], x["w_ids"] = s_ids, w_ids
        allow = None
        key = (x["book"], x["ch"], x["v"])
        if is_seed(key) and key in gold:
            g = gold[key][1]
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

    john = [i for i, x in enumerate(verses) if (x["book"], x["ch"], x["v"]) in gold]  # versículos do gabarito
    variants = ["fwd", "inter", "gd", "gdfa"]

    def align_verse(i, sym):
        """[(Strong, nota)] por palavra do versículo i; a nota é a posterior (fwd) ou a média geométrica dos dois sentidos."""
        x = verses[i]
        n, m = n_s[i], n_w[i]
        fw = fbest[pt_base[i]:pt_base[i] + m]
        rv = rbest[gr_base[i]:gr_base[i] + n]
        per = [(None, 0.0)] * m
        for gi, j in links_for(sym, fw, rv, n, m):
            p = off[i] + j * n + gi - 1
            score = pf[p] if sym == "fwd" else float(np.sqrt(pf[p] * pb[p]))
            if score > per[j][1]:
                per[j] = (inv[int(x["s_ids"][gi - 1])], score)
        return per

    best = {sym: {(verses[i]["book"], verses[i]["ch"], verses[i]["v"]): align_verse(i, sym) for i in john} for sym in variants}

    gold_words = {}
    for i in john:
        x = verses[i]
        k = (x["book"], x["ch"], x["v"])
        assert gold[k][0] == x["pt"], f"texto do gabarito difere em {k}"
        gold_words[k] = [gold[k][1].get(w[0]) for w in x["ws"]]

    def tagged(i, per, tau):
        t = [s if sc >= tau else None for s, sc in per]
        return glue(verses[i]["pt"], verses[i]["ws"], t) if a.glue else t

    gold_i = {(verses[i]["book"], verses[i]["ch"], verses[i]["v"]): i for i in john}

    def preds(sym, tau):
        return {k: tagged(gold_i[k], per, tau) for k, per in best[sym].items()}

    def chapters(r):
        """Versículos medidos: no AT, o gabarito fora da semente; no NT, João A-B."""
        if ot:
            return lambda k: not is_seed(k)
        lo, hi = rng(r)
        return lambda k: lo <= k[1] <= hi

    if a.tune:
        print(f"\nmedição {a.tune} (semente {a.seed_ids or a.seed}, peso {a.weight}, radical {'sim' if a.stem else 'não'})")
        for sym in variants:
            for tau in [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
                print(f"  {sym:5s} tau {tau:.2f}: {fmt(metrics(preds(sym, tau), gold_words, chapters(a.tune)))}")
    if a.eval:
        print(f"\nmedição {a.eval}, {a.sym}, tau {a.tau}: {fmt(metrics(preds(a.sym, a.tau), gold_words, chapters(a.eval)))}")
    if ot and a.write:
        by_file, nverses = {}, 0
        for i, x in enumerate(verses):
            k = (x["book"], x["ch"], x["v"])
            if k in gold_spans and not os.environ.get("STAT_RAW"):  # capítulo do gabarito: vale o gabarito (STAT_RAW=1 grava o cru, p/ análise)
                sp = gold_spans[k]
            else:
                sp = spans_for(x["pt"], x["ws"], tagged(i, align_verse(i, a.sym), a.tau))
            by_file.setdefault((x["book"], x["ch"]), []).append({"verse": x["v"], "spans": sp})
            nverses += 1
        for (book, ch), arr in by_file.items():
            with open(f"{WORK}/ot/{book}-{ch:02d}.align.stat.json", "w", encoding="utf8") as f:
                json.dump(arr, f, ensure_ascii=False)
        print(f"escrevi {len(by_file)} capítulos ({nverses} versículos) do AT em {WORK}/ot/ ({a.sym}, tau {a.tau})")
        return
    if a.write_nt:
        by_file, nverses = {}, 0
        for i, x in enumerate(verses):
            if x["book"] == "JHN":
                continue
            tags = [st if sc >= a.tau else None for st, sc in align_verse(i, a.sym)]
            by_file.setdefault((x["book"], x["ch"]), []).append({"verse": x["v"], "spans": spans_for(x["pt"], x["ws"], tags)})
            nverses += 1
        for (book, ch), arr in by_file.items():
            with open(f"{WORK}/nt/{book}-{ch:02d}.align.stat.json", "w", encoding="utf8") as f:
                json.dump(arr, f, ensure_ascii=False)
        print(f"escrevi {len(by_file)} capítulos ({nverses} versículos) do NT, sem João, em {WORK}/nt/ ({a.sym}, tau {a.tau})")
    if a.write:
        tags = preds(a.sym, a.tau)
        by_ch = {}
        for i in john:
            x = verses[i]
            by_ch.setdefault(x["ch"], []).append({"verse": x["v"], "spans": spans_for(x["pt"], x["ws"], tags[("JHN", x["ch"], x["v"])])})
        for ch, arr in by_ch.items():
            with open(f"{WORK}/jhn-{ch:02d}.align.stat.json", "w", encoding="utf8") as f:
                json.dump(arr, f, ensure_ascii=False)
        print(f"escrevi {len(by_ch)} capítulos de João em {WORK}/jhn-NN.align.stat.json ({a.sym}, tau {a.tau})")


if __name__ == "__main__":
    main()
