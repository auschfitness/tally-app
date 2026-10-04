import { describe, expect, it } from "vitest";
import { chapterCommentary, headingCase, jfbBlock, jfbBlocks, pickCommentary, tyndaleSegments, type CmtRow } from "./commentary";

describe("headingCase", () => {
  it("tira da CAIXA ALTA e mantém nomes próprios", () => {
    expect(headingCase("A PALAVRA FEITA CARNE")).toBe("A Palavra feita carne");
    expect(headingCase("UMA PALAVRA DO BATISTA QUE CONFIRMA ISTO")).toBe("Uma palavra do Batista que confirma isto");
    expect(headingCase("PRIMEIRA REUNIÃO DE DISCÍPULOS: JOÃO, ANDRÉ, SIMÃO, FILIPE, NATANAEL")).toBe(
      "Primeira reunião de discípulos: João, André, Simão, Filipe, Natanael",
    );
    expect(headingCase("ENTREVISTA NOTURNA DE NICODEMOS COM JESUS")).toBe("Entrevista noturna de Nicodemos com Jesus");
  });
});

describe("jfbBlock", () => {
  it("título em caixa alta com referência vira seção", () => {
    expect(jfbBlock("A PALAVRA FEITA CARNE. (Jo 1.1-14)")).toEqual({ type: "heading", title: "A Palavra feita carne", ref: "Jo 1.1-14" });
  });
  it("frase citada antes do primeiro ':' vira destaque", () => {
    expect(jfbBlock("No princípio: de todo o tempo")).toEqual({ type: "para", lead: "No princípio", text: ": de todo o tempo" });
  });
  it("sem ':' perto do início não destaca nada", () => {
    const long = "O evangelista aqui se aproxima de sua grande tese e prepara o caminho para enunciá-la: x";
    expect(jfbBlock(long)).toEqual({ type: "para", lead: null, text: long });
  });
  it("linha em caixa alta sem referência (ex.: KEBLE.) não é título", () => {
    expect(jfbBlock("KEBLE.")).toEqual({ type: "para", lead: null, text: "KEBLE." });
  });
  it("separa os parágrafos pela linha em branco", () => {
    expect(jfbBlocks("A: um\n\nB: dois\n\n")).toHaveLength(2);
  });
});

describe("tyndaleSegments", () => {
  const t1 = "1.1-18 O início deste prólogo (1.1-5) pode ter sido um hino. 1.1 Ecoando Gn 1.1, o Evangelho começa (1.12-13). • Outra nota.";
  it("quebra só nos marcadores de começo de frase", () => {
    const s = tyndaleSegments(t1, 1);
    expect(s.map((x) => x.label)).toEqual(["Jo 1.1-18", "Jo 1.1"]);
    expect(s[0]!).toMatchObject({ start: 1, end: 18, crossChapter: false });
    expect(s[0]!.paras).toEqual(["O início deste prólogo (1.1-5) pode ter sido um hino."]);
    expect(s[1]!.paras).toEqual(["Ecoando Gn 1.1, o Evangelho começa (1.12-13).", "Outra nota."]);
  });
  it("marcador que passa de capítulo é marcado", () => {
    const [s] = tyndaleSegments("1.19-12.50 Jesus se revela ao mundo.", 1);
    expect(s).toMatchObject({ label: "Jo 1.19-12.50", start: 19, crossChapter: true });
  });
  it("ignora referência no meio da frase", () => {
    const s = tyndaleSegments("3.16-21 Os tradutores debatem; 3.16-21 pode ser um comentário de João. 3.16 A verdade.", 3);
    expect(s.map((x) => x.label)).toEqual(["Jo 3.16-21", "Jo 3.16"]);
  });
});

describe("pickCommentary", () => {
  const rows: CmtRow[] = [
    { id: "jfb-1-i", source: "jfb", verse_start: 1, verse_end: 1, kind: "intro", text_pt: "A PALAVRA FEITA CARNE. (Jo 1.1-14)\n\nNo princípio: x" },
    { id: "jfb-1-2", source: "jfb", verse_start: 2, verse_end: 2, kind: "verse", text_pt: "O mesmo: y" },
    { id: "tyn-1-1", source: "tyndale", verse_start: 1, verse_end: 1, kind: "verse", text_pt: "1.1-18 Panorama. 1.1 Sobre o v1." },
    { id: "tyn-1-6", source: "tyndale", verse_start: 6, verse_end: 6, kind: "verse", text_pt: "1.6-9 Sobre o Batista." },
  ];
  it("sem versículo: só a introdução do JFB; Tyndale não tem", () => {
    expect(pickCommentary(rows, "jfb", null, 1)?.blocks[0]).toMatchObject({ type: "heading" });
    expect(pickCommentary(rows, "tyndale", null, 1)).toBeNull();
  });
  it("JFB segue o versículo exato", () => {
    expect(pickCommentary(rows, "jfb", 2, 1)).toMatchObject({ start: 2, end: 2 });
    expect(pickCommentary(rows, "jfb", 3, 1)).toBeNull();
  });
  it("Tyndale mostra os trechos cujo marcador cobre o versículo", () => {
    const v1 = pickCommentary(rows, "tyndale", 1, 1);
    expect(v1?.blocks.filter((b) => b.type === "label").map((b) => b.type === "label" && b.text)).toEqual(["Jo 1.1-18", "Jo 1.1"]);
    expect(v1).toMatchObject({ start: 1, end: 18 });
    const v7 = pickCommentary(rows, "tyndale", 7, 1);
    expect(v7?.blocks.filter((b) => b.type === "label").map((b) => b.type === "label" && b.text)).toEqual(["Jo 1.1-18", "Jo 1.6-9"]);
  });
});

describe("chapterCommentary", () => {
  const rows: CmtRow[] = [
    { id: "jfb-1-2", source: "jfb", verse_start: 2, verse_end: 2, kind: "verse", text_pt: "O mesmo: y\n\nOutro parágrafo do v2." },
    { id: "jfb-1-i", source: "jfb", verse_start: 1, verse_end: 1, kind: "intro", text_pt: "A PALAVRA FEITA CARNE. (Jo 1.1-14)\n\nNo princípio: x" },
    { id: "tyn-1-6", source: "tyndale", verse_start: 6, verse_end: 6, kind: "verse", text_pt: "1.6-9 Sobre o Batista." },
    { id: "tyn-1-1", source: "tyndale", verse_start: 1, verse_end: 1, kind: "verse", text_pt: "1.1-18 Panorama.\n1.1 Sobre o v1. • Mais sobre o v1." },
  ];

  it("JFB: intro vem primeiro, depois versículos ordenados por verse_start; primeiro bloco de cada trecho leva anchor", () => {
    const { blocks } = chapterCommentary(rows, "jfb", 1);
    expect(blocks).toHaveLength(4);
    // 1º bloco da intro: heading com anchor { start: 1, end: 1 }
    expect(blocks[0]!).toMatchObject({ type: "heading", anchor: { start: 1, end: 1 } });
    // 2º bloco da intro: para sem anchor
    expect(blocks[1]!).toMatchObject({ type: "para", lead: "No princípio" });
    expect(blocks[1]!.anchor).toBeUndefined();
    // 1º bloco do v2: para com anchor { start: 2, end: 2 }
    expect(blocks[2]!).toMatchObject({ type: "para", lead: "O mesmo", anchor: { start: 2, end: 2 } });
    // 2º bloco do v2: para sem anchor
    expect(blocks[3]!).toMatchObject({ type: "para", text: "Outro parágrafo do v2." });
    expect(blocks[3]!.anchor).toBeUndefined();
  });

  it("Tyndale: segmentos na ordem do capítulo; primeiro bloco de cada trecho leva anchor", () => {
    const { blocks } = chapterCommentary(rows, "tyndale", 1);
    expect(blocks).toHaveLength(4);
    // Segmento 1.1-18
    expect(blocks[0]!).toMatchObject({ type: "para", text: "Panorama.", anchor: { start: 1, end: 18 } });
    // Segmento 1.1 (primeiro parágrafo leva anchor, segundo não)
    expect(blocks[1]!).toMatchObject({ type: "para", text: "Sobre o v1.", anchor: { start: 1, end: 1 } });
    expect(blocks[2]!).toMatchObject({ type: "para", text: "Mais sobre o v1." });
    expect(blocks[2]!.anchor).toBeUndefined();
    // Segmento 1.6-9
    expect(blocks[3]!).toMatchObject({ type: "para", text: "Sobre o Batista.", anchor: { start: 6, end: 9 } });
  });
});

