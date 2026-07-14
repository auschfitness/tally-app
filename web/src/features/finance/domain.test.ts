import { describe, it, expect } from "vitest";
import { expenseByCat, financeMonthly, fundBalances, type FinanceEntry } from "./domain";

function e(p: Partial<FinanceEntry>): FinanceEntry {
  return {
    id: p.id ?? "1",
    type: p.type ?? "in",
    desc: p.desc ?? "",
    cat: p.cat ?? "",
    fund: p.fund ?? "Geral",
    amount: p.amount ?? 0,
    date: p.date ?? "2026-07-01",
    campus: p.campus ?? "Sede",
  };
}

describe("expenseByCat (só saídas, desc)", () => {
  it("soma saídas por categoria e ordena por valor", () => {
    const r = expenseByCat([
      e({ type: "out", cat: "Aluguel", amount: 1000 }),
      e({ type: "out", cat: "Missões", amount: 300 }),
      e({ type: "out", cat: "Aluguel", amount: 200 }),
      e({ type: "in", cat: "Dízimo", amount: 5000 }), // ignorado (entrada)
    ]);
    expect(r).toEqual([
      { cat: "Aluguel", val: 1200 },
      { cat: "Missões", val: 300 },
    ]);
  });
});

describe("fundBalances (entradas − saídas)", () => {
  it("calcula saldo por fundo, ignora fundo vazio", () => {
    const r = fundBalances([
      e({ type: "in", fund: "Geral", amount: 1000 }),
      e({ type: "out", fund: "Geral", amount: 400 }),
      e({ type: "in", fund: "Missões", amount: 250 }),
      e({ type: "in", fund: "", amount: 999 }),
    ]);
    expect(r.find((x) => x.fund === "Geral")?.balance).toBe(600);
    expect(r.find((x) => x.fund === "Missões")?.balance).toBe(250);
    expect(r.some((x) => x.fund === "")).toBe(false);
  });
});

describe("financeMonthly (somas reais, sem fabricação)", () => {
  it("distribui por mês e deixa zero onde não há lançamento", () => {
    const now = new Date(2026, 6, 15); // jul/2026
    const r = financeMonthly(
      [
        e({ type: "in", amount: 1000, date: "2026-07-03" }),
        e({ type: "out", amount: 400, date: "2026-07-10" }),
        e({ type: "in", amount: 500, date: "2026-06-20" }),
      ],
      now,
    );
    expect(r.labels).toEqual(["fev", "mar", "abr", "mai", "jun", "jul"]);
    expect(r.inc[5]).toBe(1000); // jul
    expect(r.exp[5]).toBe(400);
    expect(r.inc[4]).toBe(500); // jun
    expect(r.inc[0]).toBe(0); // fev — sem lançamento, zero real (não inventado)
  });
});
