import { describe, it, expect } from "vitest";
import { money, parseMoneyInput } from "./money";

describe("parseMoneyInput", () => {
  it("BRL: dígitos puros são centavos", () => {
    expect(parseMoneyInput("123456", "BRL")).toBe(1234.56);
    expect(parseMoneyInput("1", "BRL")).toBe(0.01);
    expect(parseMoneyInput("100", "BRL")).toBe(1);
  });
  it("BRL: com vírgula é decimal (respeita digitação manual)", () => {
    expect(parseMoneyInput("1234,5", "BRL")).toBe(1234.5);
    expect(parseMoneyInput("1234,56", "BRL")).toBe(1234.56);
    expect(parseMoneyInput("10,00", "BRL")).toBe(10);
  });
  it("BRL: reparsear a saída formatada é estável (idempotente)", () => {
    const f = money(1234.56, "BRL"); // "R$ 1.234,56"
    expect(parseMoneyInput(f, "BRL")).toBe(1234.56);
  });
  it("USD: dígitos puros são cents; ponto é decimal", () => {
    expect(parseMoneyInput("123456", "USD")).toBe(1234.56);
    expect(parseMoneyInput("1234.5", "USD")).toBe(1234.5);
    expect(parseMoneyInput(money(1234.56, "USD"), "USD")).toBe(1234.56); // "$1,234.56"
  });
  it("vazio/sem dígitos → null", () => {
    expect(parseMoneyInput("", "BRL")).toBeNull();
    expect(parseMoneyInput("R$ ", "BRL")).toBeNull();
    expect(parseMoneyInput("abc", "BRL")).toBeNull();
  });
});
