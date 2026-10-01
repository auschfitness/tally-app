"""Alinhador estatístico (sem IA): liga cada palavra da Bíblia Livre a um número de Strong.

IBM Model 1 (5 iterações) + Model 2 com prior diagonal estilo fast_align (5 iterações), treinado
no Novo Testamento inteiro (work/nt/*.json, de fetch-nt.mjs). Lado "origem" = os Strong de cada
versículo (+ NULL); lado "alvo" = as palavras em português. Não usa o gabarito de João.
Saída: work/jhn-NN.align.stat.json (formato do validate-alignment.mjs).

Uso (da raiz do repo): python scripts/align/stat-align/stat_align.py [--tau 0.5] [--lam 4] [--p0 0.1]
Eflomal não instala no Windows (precisa de make + compilador C); por isso este Model 2 próprio.
"""
import argparse, glob, json, re
import numpy as np

ROOT = "scripts/align/work"
WORD = re.compile(r"[^\W_]+(?:['’\-][^\W_]+)*")
ARTICLE = "G3588"


def load():
    verses = []  # (book, chapter, verse, pt, [strong...])
    for f in sorted(glob.glob(f"{ROOT}/nt/*.json")):
        d = json.load(open(f, encoding="utf8"))
        for v in d["verses"]:
            verses.append((d["book"], d["chapter"], v["verse"], v["pt"], [g["s"] for g in v["greek"] if g["s"]]))
    return verses


def train(verses, lam, p0, m1_iters, m2_iters):
    sid, wid = {None: 0}, {}
    toks = []  # por verso: (palavras[(ini, fim)], ids de palavra, ids de strong)
    for _, _, _, pt, strongs in verses:
        ws = [(m.start(), m.end(), m.group().lower()) for m in WORD.finditer(pt)]
        fids = [wid.setdefault(w[2], len(wid)) for w in ws]
        eids = [sid.setdefault(s, len(sid)) for s in strongs]
        toks.append((ws, fids, eids))
    NF, NE = len(wid), len(sid)
    E, F, T, D = [], [], [], []
    base = 0
    for ws, fids, eids in toks:
        m, n = len(fids), len(eids)
        if m:
            e = np.array([0] + eids)
            ii = np.arange(1, n + 1) / max(n, 1)
            for j, fw in enumerate(fids):
                d = np.empty(n + 1)
                d[0] = p0
                if n:
                    raw = np.exp(-lam * np.abs(ii - (j + 1) / m))
                    d[1:] = (1 - p0) * raw / raw.sum()
                else:
                    d[0] = 1.0
                E.append(e); F.append(np.full(n + 1, fw)); T.append(np.full(n + 1, base + j)); D.append(d)
        base += m
    E, F, T, D = map(np.concatenate, (E, F, T, D))
    key = E.astype(np.int64) * NF + F
    uniq, u = np.unique(key, return_inverse=True)
    e_of_u = uniq // NF
    t = 1.0 / np.bincount(e_of_u)[e_of_u]
    post = None
    for it in range(m1_iters + m2_iters):
        w = t[u] * (D if it >= m1_iters else 1.0)
        post = w / np.bincount(T, weights=w)[T]
        cnt = np.bincount(u, weights=post, minlength=len(uniq))
        t = cnt / np.bincount(e_of_u, weights=cnt)[e_of_u]
    return toks, sid, (E, T, post), base


def decode(E, T, post, ntok, NE):
    """Por palavra: o Strong (não-NULL) com maior posterior somada, e essa posterior."""
    keep = E != 0
    key = T[keep].astype(np.int64) * NE + E[keep]
    uk, inv = np.unique(key, return_inverse=True)
    s = np.bincount(inv, weights=post[keep])
    tok, e = uk // NE, uk % NE
    best_e = np.zeros(ntok, dtype=np.int64)
    best_p = np.zeros(ntok)
    order = np.lexsort((s, tok))  # por palavra, o último é o maior
    last = np.r_[tok[order][1:] != tok[order][:-1], True]
    sel = order[last]
    best_e[tok[sel]] = e[sel]
    best_p[tok[sel]] = s[sel]
    return best_e, best_p


def spans_for(pt, ws, tags):
    """Palavras com Strong -> trechos. Artigo grego cola na palavra de conteúdo seguinte
    (regra 4 do ALIGN-PROMPT); vizinhas com o mesmo Strong viram um trecho só."""
    units = [[a, b, s] for (a, b, _), s in zip(ws, tags)]
    out = []
    for u in units:
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tau", type=float, default=0.5, help="posterior mínima para ligar (abaixo disso: sem Strong)")
    ap.add_argument("--lam", type=float, default=4.0)
    ap.add_argument("--p0", type=float, default=0.1)
    ap.add_argument("--m1", type=int, default=5)
    ap.add_argument("--m2", type=int, default=5)
    a = ap.parse_args()
    verses = load()
    toks, sid, (E, T, post), ntok = train(verses, a.lam, a.p0, a.m1, a.m2)
    inv = {i: s for s, i in sid.items()}
    best_e, best_p = decode(E, T, post, ntok, len(sid))
    print(f"treino: {len(verses)} versículos, {ntok} palavras PT, {len(sid) - 1} Strong distintos")
    base, written, by_ch = 0, 0, {}
    for (book, ch, v, pt, _), (ws, _, _) in zip(verses, toks):
        m = len(ws)
        tags = [inv[best_e[base + j]] if best_p[base + j] >= a.tau else None for j in range(m)]
        base += m
        if book != "JHN":
            continue
        by_ch.setdefault(ch, []).append({"verse": v, "spans": spans_for(pt, ws, tags)})
    for ch, arr in by_ch.items():
        with open(f"{ROOT}/jhn-{ch:02d}.align.stat.json", "w", encoding="utf8") as f:
            json.dump(arr, f, ensure_ascii=False)
        written += 1
    print(f"escrevi {written} capítulos de João em {ROOT}/jhn-NN.align.stat.json (tau={a.tau})")


if __name__ == "__main__":
    main()
