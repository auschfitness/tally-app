import { describe, it, expect } from "vitest";
import { isCurrency, isLanguage, isTimezone, readInstitution, readAccount } from "./domain";

describe("validadores de opção", () => {
  it("moeda/idioma/fuso só aceitam valores conhecidos", () => {
    expect(isCurrency("BRL")).toBe(true);
    expect(isCurrency("EUR")).toBe(false);
    expect(isLanguage("pt")).toBe(true);
    expect(isLanguage("xx")).toBe(false);
    expect(isTimezone("America/Sao_Paulo")).toBe(true);
    expect(isTimezone("Mars/Base")).toBe(false);
  });
});

describe("readInstitution (leitura segura do blob)", () => {
  it("lê multiInstitution + lista de strings", () => {
    const data = { institution: { multiInstitution: true, institutions: ["Sede", "Filial", 42] }, outra: 1 };
    expect(readInstitution(data)).toEqual({ multiInstitution: true, institutions: ["Sede", "Filial"] });
  });
  it("defaults seguros quando ausente/malformado", () => {
    expect(readInstitution(null)).toEqual({ multiInstitution: false, institutions: [] });
    expect(readInstitution({ institution: "x" })).toEqual({ multiInstitution: false, institutions: [] });
  });
});

describe("readAccount (leitura segura do blob)", () => {
  it("lê idioma/fuso válidos", () => {
    expect(readAccount({ account: { language: "en", timezone: "America/Chicago" } })).toEqual({ language: "en", timezone: "America/Chicago" });
  });
  it("cai nos defaults quando inválido/ausente", () => {
    expect(readAccount({})).toEqual({ language: "pt", timezone: "America/Sao_Paulo" });
    expect(readAccount({ account: { language: "xx", timezone: "zzz" } })).toEqual({ language: "pt", timezone: "America/Sao_Paulo" });
  });
});
