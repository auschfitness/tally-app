import { describe, it, expect } from "vitest";
import {
  EMPTY_WS,
  MAX_TABS,
  adjacentChapter,
  chapterCount,
  closeTab,
  glossOf,
  groupOccurrences,
  groupOriginal,
  openTab,
  releaseVelocity,
  parseLastRead,
  parseRouteRef,
  pushRecent,
  rubberband,
  sheetAfterDrag,
  tabKey,
  versesFromPlain,
  versesFromTagged,
  type Workspace,
} from "./reader";

describe("versículos", () => {
  it("versesFromTagged agrupa por versículo e ordena por posição", () => {
    const v = versesFromTagged([
      { verse: 1, position: 2, text: " ", strong: null },
      { verse: 2, position: 1, text: "Esta", strong: "G3778" },
      { verse: 1, position: 1, text: "No princípio", strong: "G0746" },
      { verse: 1, position: 3, text: "era", strong: "G1510" },
    ]);
    expect(v.map((x) => x.n)).toEqual([1, 2]);
    expect(v[0]?.spans.map((s) => s.text).join("")).toBe("No princípio era");
    expect(v[0]?.spans[0]?.strong).toBe("G0746");
  });

  it("versesFromPlain vira um trecho sem Strong por versículo", () => {
    expect(versesFromPlain([{ n: 3, text: "Todas as coisas" }])).toEqual([{ n: 3, spans: [{ text: "Todas as coisas", strong: null }] }]);
  });

  it("groupOriginal agrupa tokens por versículo em ordem", () => {
    const g = groupOriginal([
      { verse: 2, position: 1, surface: "οὗτος", strong: "G3778", translit: "houtos", lang: "grc" },
      { verse: 1, position: 2, surface: "ἀρχῇ", strong: "G0746", translit: "archē", lang: "grc" },
      { verse: 1, position: 1, surface: "Ἐν", strong: "G1722", translit: "En", lang: "grc" },
    ]);
    expect(g.map((x) => x.n)).toEqual([1, 2]);
    expect(g[0]?.words.map((w) => w.surface)).toEqual(["Ἐν", "ἀρχῇ"]);
  });
});

describe("capítulos", () => {
  it("chapterCount conhece o cânon (1189 capítulos)", () => {
    expect(chapterCount("JHN")).toBe(21);
    expect(chapterCount("PSA")).toBe(150);
    expect(chapterCount("XXX")).toBe(0);
  });

  it("parseRouteRef aceita USFM em qualquer caixa e recusa capítulo fora do livro", () => {
    expect(parseRouteRef("jhn", "1")).toEqual({ book: "JHN", chapter: 1 });
    expect(parseRouteRef("JHN", "22")).toBeNull();
    expect(parseRouteRef("JHN", "abc")).toBeNull();
    expect(parseRouteRef("XXX", "1")).toBeNull();
  });

  it("adjacentChapter cruza livros e para nas pontas do cânon", () => {
    expect(adjacentChapter({ book: "JHN", chapter: 1 }, -1)).toEqual({ book: "LUK", chapter: 24 });
    expect(adjacentChapter({ book: "JHN", chapter: 21 }, 1)).toEqual({ book: "ACT", chapter: 1 });
    expect(adjacentChapter({ book: "JHN", chapter: 3 }, 1)).toEqual({ book: "JHN", chapter: 4 });
    expect(adjacentChapter({ book: "GEN", chapter: 1 }, -1)).toBeNull();
    expect(adjacentChapter({ book: "REV", chapter: 22 }, 1)).toBeNull();
  });

  it("parseLastRead cai em João 1 com lixo ou capítulo inválido", () => {
    expect(parseLastRead(null)).toEqual({ book: "JHN", chapter: 1 });
    expect(parseLastRead("{quebrado")).toEqual({ book: "JHN", chapter: 1 });
    expect(parseLastRead(JSON.stringify({ book: "ROM", chapter: 8 }))).toEqual({ book: "ROM", chapter: 8 });
    expect(parseLastRead(JSON.stringify({ book: "ROM", chapter: 99 }))).toEqual({ book: "JHN", chapter: 1 });
  });

  it("pushRecent põe na frente, sem repetir, no máximo 3", () => {
    const a = { book: "JHN", chapter: 1 };
    const b = { book: "ROM", chapter: 8 };
    const c = { book: "PSA", chapter: 23 };
    const d = { book: "GEN", chapter: 1 };
    expect(pushRecent([a, b, c], d)).toEqual([d, a, b]);
    expect(pushRecent([a, b, c], b)).toEqual([b, a, c]);
  });
});

describe("léxico e ocorrências", () => {
  it("glossOf prefere o português e cai no inglês", () => {
    expect(glossOf({ strong: "G3056", lemma: "λόγος", translit: "logos", gloss: "word", gloss_pt: "palavra, razão" })).toBe("palavra, razão");
    expect(glossOf({ strong: "G3056", lemma: "λόγος", translit: "logos", gloss: "word", gloss_pt: null })).toBe("word");
    expect(glossOf(undefined)).toBe("");
  });

  it("groupOccurrences converte OSIS, soma e ordena pelo cânon", () => {
    const g = groupOccurrences([
      { book: "Amos", chapter: 6, n: 2 },
      { book: "Gen", chapter: 10, n: 1 },
      { book: "Gen", chapter: 1, n: 1 },
      { book: "Tobit", chapter: 1, n: 5 },
    ]);
    expect(g.map((b) => b.book)).toEqual(["GEN", "AMO"]);
    expect(g[0]?.total).toBe(2);
    expect(g[0]?.chapters.map((c) => c.chapter)).toEqual([1, 10]);
    expect(g[0]?.name).toBe("Gênesis");
  });
});

describe("área de trabalho", () => {
  it("a aba Palavra é uma só: outra palavra troca o conteúdo e ativa", () => {
    const pick = { book: "JHN", chapter: 1, verse: 1, text: "Verbo", surface: "λόγος", translit: "logos", morph: "N-NSM" };
    let ws: Workspace = openTab(EMPTY_WS, { kind: "word", strong: "G3056", key: "1:3", ...pick });
    ws = openTab(ws, { kind: "notes" });
    ws = openTab(ws, { kind: "word", strong: "G2316", key: "1:9", ...pick });
    expect(ws.tabs.length).toBe(2);
    expect(ws.active).toBe("word");
    expect(ws.tabs.find((t) => t.kind === "word")).toMatchObject({ strong: "G2316", key: "1:9" });
  });

  it("a 6ª aba derruba a mais antiga", () => {
    let ws: Workspace = EMPTY_WS;
    for (let v = 1; v <= MAX_TABS + 1; v++) ws = openTab(ws, { kind: "verse", book: "JHN", chapter: 1, verse: v });
    expect(ws.tabs.length).toBe(MAX_TABS);
    expect(ws.tabs.map(tabKey)[0]).toBe("verse:JHN.1.2");
    expect(ws.active).toBe("verse:JHN.1.6");
  });

  it("o Sermão nunca é a aba derrubada, mesmo sendo a mais antiga", () => {
    let ws: Workspace = openTab(EMPTY_WS, { kind: "sermon" });
    for (let v = 1; v <= MAX_TABS; v++) ws = openTab(ws, { kind: "verse", book: "JHN", chapter: 1, verse: v });
    expect(ws.tabs.length).toBe(MAX_TABS);
    expect(ws.tabs.map(tabKey)).toEqual(["sermon", "verse:JHN.1.2", "verse:JHN.1.3", "verse:JHN.1.4", "verse:JHN.1.5"]);
    expect(ws.active).toBe("verse:JHN.1.5");
  });

  it("o mesmo versículo em capítulos diferentes são abas diferentes", () => {
    const ws = openTab(openTab(EMPTY_WS, { kind: "verse", book: "JHN", chapter: 1, verse: 1 }), { kind: "verse", book: "JHN", chapter: 2, verse: 1 });
    expect(ws.tabs.length).toBe(2);
  });

  it("fechar a ativa ativa a vizinha; fechar a última esvazia", () => {
    let ws: Workspace = openTab(openTab(EMPTY_WS, { kind: "notes" }), { kind: "sermon" });
    ws = closeTab(ws, "sermon");
    expect(ws.active).toBe("notes");
    ws = closeTab(ws, "notes");
    expect(ws).toEqual({ tabs: [], active: null });
  });
});

describe("gaveta (celular)", () => {
  it("velocidade de soltura usa só os últimos 80ms", () => {
    const samples = [{ y: 0, t: 0 }, { y: 10, t: 500 }, { y: 20, t: 940 }, { y: 60, t: 1000 }];
    expect(releaseVelocity(samples)).toBeCloseTo(40 / 60);
    expect(releaseVelocity([{ y: 5, t: 10 }])).toBe(0);
    expect(releaseVelocity([])).toBe(0);
  });

  it("peteleco para baixo fecha a meia gaveta e baixa a cheia", () => {
    expect(sheetAfterDrag("half", 30, 0.5)).toBe("closed");
    expect(sheetAfterDrag("full", 30, 0.5)).toBe("half");
  });
  it("arrastar para cima abre cheia; movimento pequeno e lento não muda nada", () => {
    expect(sheetAfterDrag("half", -100, -0.05)).toBe("full");
    expect(sheetAfterDrag("half", 10, 0.02)).toBe("half");
  });
  it("rubberband resiste cada vez mais", () => {
    const a = rubberband(50, 800);
    const b = rubberband(200, 800);
    expect(a).toBeLessThan(50);
    expect(b - a).toBeLessThan(150);
  });
});
