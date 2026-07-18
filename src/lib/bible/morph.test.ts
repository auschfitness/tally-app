import { describe, it, expect } from "vitest";
import { decodeMorph } from "./morph";

describe("decodeMorph — grego (Robinson/Tyndale)", () => {
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
  it("ignora sufixo extra (N-NSM-T degrada para o nominal)", () => {
    expect(decodeMorph("N-NSM-T", "grc")).toBe("Substantivo · Nominativo · singular · masculino");
  });
  it("decodifica artigo T-NSM e T-GSF", () => {
    expect(decodeMorph("T-NSM", "grc")).toBe("Artigo · Nominativo · singular · masculino");
    expect(decodeMorph("T-GSF", "grc")).toBe("Artigo · Genitivo · singular · feminino");
  });
  it("cai no código cru quando não reconhece a classe", () => {
    expect(decodeMorph("ZZZ", "grc")).toBe("ZZZ");
  });
  it("vazio → vazio", () => {
    expect(decodeMorph("", "grc")).toBe("");
    expect(decodeMorph(null, "grc")).toBe("");
  });
});

describe("decodeMorph — hebraico (STEPBible)", () => {
  it("decodifica verbo qal perfeito 3ms (HVqp3ms)", () => {
    expect(decodeMorph("HVqp3ms", "hbo")).toBe("Verbo · Qal · Perfeito · 3ª pessoa · masculino · singular");
  });
  it("decodifica substantivo comum (HNcmpa = Elohim)", () => {
    expect(decodeMorph("HNcmpa", "hbo")).toBe("Substantivo · masculino · plural");
  });
  it("decodifica composto preposição + substantivo (HR/Ncfsa)", () => {
    expect(decodeMorph("HR/Ncfsa", "hbo")).toBe("Preposição + Substantivo · feminino · singular");
  });
  it("decodifica composto artigo + substantivo (HTd/Ncmpa)", () => {
    expect(decodeMorph("HTd/Ncmpa", "hbo")).toBe("Artigo + Substantivo · masculino · plural");
  });
  it("decodifica composto conjunção + objeto (HC/To)", () => {
    expect(decodeMorph("HC/To", "hbo")).toBe("Conjunção + Partícula de objeto");
  });
  it("cai no cru quando não reconhece nada", () => {
    expect(decodeMorph("XYZ", "hbo")).toBe("XYZ");
  });
  it("segmento composto desconhecido fica cru, o reconhecido decodifica", () => {
    expect(decodeMorph("HR/Zzz", "hbo")).toBe("Preposição + Zzz");
  });
});
