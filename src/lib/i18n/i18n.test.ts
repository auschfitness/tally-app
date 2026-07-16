import { describe, it, expect } from "vitest";
import { LOCALES, DEFAULT_LOCALE, isLocale, normalizeLocale } from "./config";
import { getDictionary } from "./dictionaries";

describe("config de locale", () => {
  it("isLocale só aceita os 3 valores do CHECK", () => {
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("pt")).toBe(false); // 'pt' não é válido — é 'pt-BR'
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
  it("normalizeLocale cai no default (pt-BR) quando inválido/ausente", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("xx")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("pt-BR");
  });
});

describe("dicionários", () => {
  it("todo locale tem dicionário com as MESMAS chaves (completude)", () => {
    const keysOf = (o: object): string[] => Object.keys(o).flatMap((k) => {
      const v = (o as Record<string, unknown>)[k];
      return v && typeof v === "object" ? [k, ...keysOf(v as object).map((sk) => `${k}.${sk}`)] : [k];
    });
    const base = keysOf(getDictionary("pt-BR")).sort();
    for (const l of LOCALES) {
      expect(keysOf(getDictionary(l)).sort()).toEqual(base);
      // nenhuma string vazia
      const flat = JSON.stringify(getDictionary(l));
      expect(flat.includes('""')).toBe(false);
    }
  });
});
