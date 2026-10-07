import { describe, it, expect } from "vitest";
import { highlight, searchTerms } from "./search";

describe("searchTerms", () => {
  it("tira acento, aspas, operadores e palavras curtas", () => {
    expect(searchTerms('"pão da vida" -fermento')).toEqual(["pao", "vida"]);
  });
});

describe("highlight", () => {
  const hits = (t: string, q: string) => highlight(t, searchTerms(q)).filter((s) => s.hit).map((s) => s.text);
  it("marca a mesma raiz sem acento", () => expect(hits("Pela graça sois salvos; graças a Deus.", "graca")).toEqual(["graça", "graças"]));
  it("não marca palavra que só começa parecido e é bem maior", () => expect(hits("Graciosamente deu.", "graça")).toEqual([]));
  it("sem termos, texto inteiro sem marca", () => expect(highlight("Texto", [])).toEqual([{ text: "Texto", hit: false }]));
  it("junta pedaços vizinhos", () => expect(highlight("o pão", ["pao"])).toEqual([{ text: "o ", hit: false }, { text: "pão", hit: true }]));
});
