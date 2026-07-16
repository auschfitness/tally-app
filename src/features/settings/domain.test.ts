import { describe, it, expect } from "vitest";
import { isCurrency, isTimezone, readInstitution, readAccount } from "./domain";

describe("validadores de opção", () => {
  it("moeda/fuso só aceitam valores conhecidos", () => {
    expect(isCurrency("BRL")).toBe(true);
    expect(isCurrency("EUR")).toBe(false);
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

describe("readAccount (leitura segura do blob — só fuso)", () => {
  it("lê fuso válido", () => {
    expect(readAccount({ account: { timezone: "America/Chicago" } })).toEqual({ timezone: "America/Chicago" });
  });
  it("cai no default quando inválido/ausente", () => {
    expect(readAccount({})).toEqual({ timezone: "America/Sao_Paulo" });
    expect(readAccount({ account: { timezone: "zzz" } })).toEqual({ timezone: "America/Sao_Paulo" });
  });
});
