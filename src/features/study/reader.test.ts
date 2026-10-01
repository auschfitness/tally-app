import { describe, it, expect } from "vitest";
import { paragraphStartsOf } from "@/lib/bible/paragraphs";
import {
  EMPTY_WS,
  MAX_TABS,
  adjacentChapter,
  chapterCount,
  closeTab,
  curlyQuotes,
  filterOccurrences,
  glossOf,
  isHlColor,
  colorFor,
  copyText,
  selectionLabel,
  notesFirst,
  groupOccurrences,
  groupOriginal,
  openTab,
  releaseVelocity,
  toParagraphs,
  withChapterCount,
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

  it("withChapterCount põe o número do contador no capítulo aberto e acerta o total", () => {
    const g = groupOccurrences([
      { book: "Matt", chapter: 1, n: 41 },
      { book: "Matt", chapter: 2, n: 5 },
    ]);
    const mt = withChapterCount(g, { book: "MAT", chapter: 1 }, 40)[0];
    expect(mt?.chapters.map((c) => c.n)).toEqual([40, 5]);
    expect(mt?.total).toBe(45);
    expect(withChapterCount(g, { book: "MAT", chapter: 1 }, 0)).toBe(g);
    expect(withChapterCount(g, { book: "MAT", chapter: 9 }, 3)).toEqual(g);
  });
});

describe("parágrafos", () => {
  const vs = [1, 2, 3, 4, 5].map((n) => ({ n, spans: [] }));
  it("toParagraphs abre bloco novo nos versículos marcados", () => {
    expect(toParagraphs(vs, [3, 5]).map((p) => p.map((v) => v.n))).toEqual([[1, 2], [3, 4], [5]]);
    expect(toParagraphs(vs, [])).toHaveLength(1);
    expect(toParagraphs([], [3])).toEqual([]);
  });
  it("paragraphStartsOf lê o mapa gerado (Gênesis 1 quebra por dia)", () => {
    expect(paragraphStartsOf("GEN", 1).slice(0, 3)).toEqual([3, 6, 9]);
    expect(paragraphStartsOf("XXX", 1)).toEqual([]);
  });
});

describe("aspas curvas", () => {
  const t = (...texts: string[]): string => curlyQuotes(texts.map((text) => ({ text, strong: null }))).map((s) => s.text).join("");
  it("abre depois de espaço ou início e fecha depois de letra ou pontuação", () => {
    expect(t('Disse: "Haja luz!" E houve.')).toBe("Disse: “Haja luz!” E houve.");
    expect(t('"Amém"')).toBe("“Amém”");
    expect(t("d'água, 'sim'")).toBe("d’água, ‘sim’");
  });
  it("o contexto atravessa os trechos ligados", () => {
    expect(t("disse ", '"', "Amém", '"', " e foi")).toBe("disse “Amém” e foi");
    expect(t('"Eu', ' sou"')).toBe("“Eu sou”");
  });
  it("versesFromPlain e versesFromTagged aplicam", () => {
    expect(versesFromPlain([{ n: 1, text: 'Ele disse: "Vem".' }])[0]?.spans[0]?.text).toBe("Ele disse: “Vem”.");
    expect(versesFromTagged([{ verse: 1, position: 1, text: '"Vem"', strong: null }])[0]?.spans[0]?.text).toBe("“Vem”");
  });
});

describe("filtro de ocorrências", () => {
  const books = groupOccurrences([
    { book: "Matt", chapter: 1, n: 3 },
    { book: "Matt", chapter: 20, n: 2 },
    { book: "Gen", chapter: 1, n: 1 },
    { book: "Gen", chapter: 20, n: 1 },
  ]);
  it("sem consulta devolve tudo; texto casa o livro sem acento nem caixa", () => {
    expect(filterOccurrences(books, " ")).toHaveLength(2);
    expect(filterOccurrences(books, "GENESIS").map((b) => b.book)).toEqual(["GEN"]);
  });
  it("número restringe aos capítulos; sem texto vale para todos os livros", () => {
    expect(filterOccurrences(books, "mateus 20")[0]?.chapters).toEqual([{ chapter: 20, n: 2 }]);
    expect(filterOccurrences(books, "1").flatMap((b) => b.chapters.map((c) => c.chapter))).toEqual([1, 1]);
    expect(filterOccurrences(books, "mateus 5")).toEqual([]);
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

describe("destaques e notas (spec 08)", () => {
  it("cor na seleção: todos já na cor tira; senão aplica em todos", () => {
    expect(colorFor([undefined], "yellow")).toBe("yellow");
    expect(colorFor(["yellow"], "yellow")).toBeNull();
    expect(colorFor(["yellow"], "blue")).toBe("blue");
    expect(colorFor(["yellow", "yellow"], "yellow")).toBeNull();
    expect(colorFor(["yellow", undefined], "yellow")).toBe("yellow");
  });
  it("rótulo da seleção comprime corridas em intervalo", () => {
    const j = { book: "JHN", chapter: 3 };
    expect(selectionLabel(j, [16])).toBe("João 3:16");
    expect(selectionLabel(j, [18, 16, 17])).toBe("João 3:16-18");
    expect(selectionLabel(j, [16, 18])).toBe("João 3:16, 18");
    expect(selectionLabel(j, [1, 2, 3, 7, 9, 10])).toBe("João 3:1-3, 7, 9-10");
  });
  it("copia os versículos na ordem com a referência", () => {
    const j = { book: "JHN", chapter: 3 };
    const vs = [
      { n: 16, spans: [{ text: "Porque Deus ", strong: null }, { text: "amou. ", strong: "G25" }] },
      { n: 17, spans: [{ text: "Pois não.", strong: null }] },
      { n: 18, spans: [{ text: "Quem crê.", strong: null }] },
    ];
    expect(copyText(j, vs, [17, 16])).toBe("Porque Deus amou. Pois não.\n— João 3:16-17 (Bíblia Livre)");
  });
  it("valida cor vinda de fora", () => {
    expect(isHlColor("pink")).toBe(true);
    expect(isHlColor("red")).toBe(false);
    expect(isHlColor(3)).toBe(false);
  });
  it("põe as notas do versículo primeiro sem perder as outras", () => {
    const ns = [{ id: "a", verse_start: 2 }, { id: "b", verse_start: 5 }, { id: "c", verse_start: null }, { id: "d", verse_start: 5 }];
    expect(notesFirst(ns, 5).map((n) => n.id)).toEqual(["b", "d", "a", "c"]);
    expect(notesFirst(ns, null)).toBe(ns);
  });
});
