import { describe, expect, it } from "vitest";
import { verseText } from "./helloao";

describe("verseText", () => {
  it("descarta o ')' da nota de rodapé que ficou fora dela (Jo 2:6)", () => {
    const v = { number: 6, content: ["cabiam duas ou três metretas.", { noteId: 1 }, ")"] };
    expect(verseText(v)).toBe("cabiam duas ou três metretas.");
  });
  it("mantém o resto do trecho depois da nota (Mt 23:5)", () => {
    const v = { number: 5, content: ["alargam seus filactérios", { noteId: 2 }, ") e fazem compridas"] };
    expect(verseText(v)).toBe("alargam seus filactérios e fazem compridas");
  });
  it("não mexe em ')' legítimo fora de nota", () => {
    expect(verseText({ number: 1, content: ["(porque era tarde)"] })).toBe("(porque era tarde)");
  });
});
