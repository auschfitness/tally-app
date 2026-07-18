import { describe, it, expect } from "vitest";
import { decodeMorph } from "./morph";

describe("decodeMorph — grego", () => {
  it("decodifica verbo finito V-AAI-3S", () => {
    expect(decodeMorph("V-AAI-3S", "grc")).toBe("Verbo · Aoristo · Ativa · Indicativo · 3ª pessoa · singular");
  });
  it("decodifica verbo presente ativo indicativo 1ª pl", () => {
    expect(decodeMorph("V-PAI-1P", "grc")).toBe("Verbo · Presente · Ativa · Indicativo · 1ª pessoa · plural");
  });
  it("ignora o dígito de 2ª forma (V-2AAI-3S = 2º aoristo)", () => {
    expect(decodeMorph("V-2AAI-3S", "grc")).toBe("Verbo · Aoristo · Ativa · Indicativo · 3ª pessoa · singular");
  });
  it("decodifica particípio 2º aoristo V-2AAP-NSM", () => {
    expect(decodeMorph("V-2AAP-NSM", "grc")).toBe("Verbo · Aoristo · Ativa · Particípio · Nominativo · singular · masculino");
  });
  it("decodifica nominal N-NSM (caso/número/gênero)", () => {
    expect(decodeMorph("N-NSM", "grc")).toBe("Substantivo · Nominativo · singular · masculino");
  });
  it("decodifica artigo T-GSF", () => {
    expect(decodeMorph("T-GSF", "grc")).toBe("Artigo · Genitivo · singular · feminino");
  });
  it("cai no código cru quando não reconhece", () => {
    expect(decodeMorph("ZZZ", "grc")).toBe("ZZZ");
  });
  it("vazio → vazio", () => {
    expect(decodeMorph("", "grc")).toBe("");
    expect(decodeMorph(null, "grc")).toBe("");
  });
});

describe("decodeMorph — hebraico", () => {
  it("decodifica verbo qal perfeito 3ms (HVqp3ms)", () => {
    expect(decodeMorph("HVqp3ms", "hbo")).toBe("Verbo · Qal · Perfeito · 3ª pessoa · masculino · singular");
  });
  it("substantivo com gênero/número", () => {
    // HNcmp-like: começa por N; decodifica traços de gênero/número que reconhecer
    const out = decodeMorph("HNmp", "hbo");
    expect(out).toContain("Substantivo");
    expect(out).toContain("masculino");
    expect(out).toContain("plural");
  });
  it("cai no cru quando não reconhece", () => {
    expect(decodeMorph("XYZ", "hbo")).toBe("XYZ");
  });
});
