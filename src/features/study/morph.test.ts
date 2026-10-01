import { describe, expect, it } from "vitest";
import { morphPt } from "./morph";

describe("morphPt", () => {
  it("grego (Robinson)", () => {
    expect(morphPt("V-AAI-3S")).toBe("verbo · aoristo ativo indicativo · 3ª pessoa do singular");
    expect(morphPt("V-PAP-NSM")).toBe("verbo · presente ativo particípio · nominativo singular masculino");
    expect(morphPt("V-2AAN")).toBe("verbo · aoristo ativo infinitivo");
    expect(morphPt("N-GSM-P")).toBe("nome próprio · genitivo singular masculino");
    expect(morphPt("T-ASM")).toBe("artigo · acusativo singular masculino");
    expect(morphPt("P-1NS")).toBe("pronome pessoal · 1ª pessoa nominativo singular");
    expect(morphPt("CONJ")).toBe("conjunção");
    expect(morphPt("ADV")).toBe("advérbio");
  });

  it("hebraico (OSHB)", () => {
    expect(morphPt("HVqp3ms")).toBe("verbo · qal perfeito · 3ª pessoa masculino singular");
    expect(morphPt("HR/Ncfsa")).toBe("substantivo · feminino singular absoluto · com preposição");
    expect(morphPt("HTd/Ncmpa")).toBe("substantivo · masculino plural absoluto · com artigo");
    expect(morphPt("HTo")).toBe("marcador de objeto direto");
  });

  it("vazio ou desconhecido some", () => {
    expect(morphPt(null)).toBe("");
    expect(morphPt("ZZZ")).toBe("");
  });
});
