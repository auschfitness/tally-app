import { describe, it, expect } from "vitest";
import { isFunctionWord } from "./morph";
import { buildKeywords, type KeywordToken } from "./keywords";

describe("isFunctionWord", () => {
  it("grego: descarta artigo/conjunção/preposição/partícula, mantém conteúdo", () => {
    expect(isFunctionWord("T-NSM", "grc")).toBe(true);
    expect(isFunctionWord("CONJ", "grc")).toBe(true);
    expect(isFunctionWord("PREP", "grc")).toBe(true);
    expect(isFunctionWord("PRT", "grc")).toBe(true);
    expect(isFunctionWord("V-AAI-3S", "grc")).toBe(false);
    expect(isFunctionWord("N-NSM", "grc")).toBe(false);
    expect(isFunctionWord("ADV", "grc")).toBe(false);
  });
  it("hebraico: olha a palavra principal (última sub-palavra do composto)", () => {
    expect(isFunctionWord("HR/Ncfsa", "hbo")).toBe(false); // prep + SUBSTANTIVO → conteúdo
    expect(isFunctionWord("HTd/Ncmpa", "hbo")).toBe(false); // artigo + SUBSTANTIVO → conteúdo
    expect(isFunctionWord("HVqp3ms", "hbo")).toBe(false); // verbo → conteúdo
    expect(isFunctionWord("HR", "hbo")).toBe(true); // preposição pura
    expect(isFunctionWord("HC/To", "hbo")).toBe(true); // conjunção + partícula-objeto
    expect(isFunctionWord("HTo", "hbo")).toBe(true); // marcador de objeto (את)
  });
  it("sem morph → não descarta", () => {
    expect(isFunctionWord("", "grc")).toBe(false);
    expect(isFunctionWord(null, "hbo")).toBe(false);
  });
});

const tok = (strong: string | null, morph: string, lemma = "x", gloss = "g"): KeywordToken => ({
  strong,
  morph,
  lemma,
  gloss,
});

describe("buildKeywords", () => {
  it("descarta funcionais, agrupa por Strong e ranqueia raras primeiro", () => {
    const tokens: KeywordToken[] = [
      tok("G3588", "T-NSM"), // artigo → fora
      tok("G0025", "V-AAI-3S", "ἀγαπάω", "loved"), // conteúdo, raro (143)
      tok("G3056", "N-NSM", "λόγος", "word"), // conteúdo, comum (332)
      tok("G0025", "V-PAI-1S", "ἀγαπάω", "love"), // mesmo Strong → count 2
      tok(null, "N-NSM"), // sem Strong → fora
    ];
    const lex = { G0025: { lemma: "ἀγαπάω", gloss: "to love", definition: "" }, G3056: { lemma: "λόγος", gloss: "word", definition: "" } };
    const freq = { G0025: 143, G3056: 332 };
    const out = buildKeywords(tokens, "grc", lex as never, freq);
    expect(out.map((k) => k.strong)).toEqual(["G0025", "G3056"]); // raro (143) antes de comum (332)
    expect(out[0]!.count).toBe(2);
    expect(out[0]!.meaning).toBe("to love"); // do léxico
    expect(out[0]!.occurrences).toBe(143);
  });
  it("frequência desconhecida vai para o fim", () => {
    const tokens = [tok("G1", "N-NSM"), tok("G2", "N-NSM")];
    const out = buildKeywords(tokens, "grc", {}, { G2: 5 });
    expect(out.map((k) => k.strong)).toEqual(["G2", "G1"]); // G1 sem freq → fim
    expect(out[1]!.occurrences).toBeNull();
  });
});
