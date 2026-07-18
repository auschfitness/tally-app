import { describe, it, expect } from "vitest";
import { brDate, usDate, brToIso, maskBrDate, zonedTodayIso } from "./date";

describe("brDate (ISO → dd/mm/aaaa)", () => {
  it("converte data ISO", () => {
    expect(brDate("2026-07-12")).toBe("12/07/2026");
  });
  it("vazio para nulo/indefinido", () => {
    expect(brDate(null)).toBe("");
    expect(brDate(undefined)).toBe("");
  });
});

describe("usDate (ISO → mm/dd/aaaa)", () => {
  it("converte data ISO na convenção dos EUA", () => {
    expect(usDate("2026-07-12")).toBe("07/12/2026");
    expect(usDate("2026-05-10")).toBe("05/10/2026");
  });
  it("vazio para nulo/indefinido/incompleto", () => {
    expect(usDate(null)).toBe("");
    expect(usDate(undefined)).toBe("");
    expect(usDate("2026-07")).toBe("");
  });
});

describe("maskBrDate (máscara progressiva dd/mm/aaaa)", () => {
  it("insere as barras conforme digita", () => {
    expect(maskBrDate("1")).toBe("1");
    expect(maskBrDate("12")).toBe("12");
    expect(maskBrDate("120")).toBe("12/0");
    expect(maskBrDate("1207")).toBe("12/07");
    expect(maskBrDate("12072")).toBe("12/07/2");
    expect(maskBrDate("12072026")).toBe("12/07/2026");
  });
  it("ignora não-dígitos e limita a 8 dígitos", () => {
    expect(maskBrDate("12/07/2026")).toBe("12/07/2026");
    expect(maskBrDate("12072026999")).toBe("12/07/2026");
    expect(maskBrDate("ab12cd07")).toBe("12/07");
  });
});

describe("brToIso (dd/mm/aaaa → ISO)", () => {
  it("converte data completa e válida", () => {
    expect(brToIso("12/07/2026")).toBe("2026-07-12");
  });
  it("vazio para incompleta ou malformada", () => {
    expect(brToIso("12/07")).toBe("");
    expect(brToIso("")).toBe("");
    expect(brToIso("2026-07-12")).toBe("");
  });
  it("vazio para data inexistente (rollover)", () => {
    expect(brToIso("31/02/2026")).toBe(""); // 31 de fevereiro não existe
    expect(brToIso("00/01/2026")).toBe("");
    expect(brToIso("32/01/2026")).toBe("");
  });
});

describe("zonedTodayIso (hoje no fuso, SSR em UTC)", () => {
  it("corrige o off-by-one: noite no Brasil ainda é o dia anterior", () => {
    // 17/jul 01:00 UTC = 16/jul 22:00 em São Paulo (GMT-3)
    const instant = new Date("2026-07-17T01:00:00Z");
    expect(zonedTodayIso("America/Sao_Paulo", instant)).toBe("2026-07-16");
  });
  it("meio-dia UTC bate com o dia local", () => {
    const instant = new Date("2026-07-17T12:00:00Z");
    expect(zonedTodayIso("America/Sao_Paulo", instant)).toBe("2026-07-17");
    expect(zonedTodayIso("America/New_York", instant)).toBe("2026-07-17");
  });
  it("fuso inválido cai para a data do servidor (não quebra)", () => {
    expect(zonedTodayIso("Zzz/Invalid", new Date("2026-07-17T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
