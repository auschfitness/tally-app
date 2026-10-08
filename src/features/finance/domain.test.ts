import { describe, it, expect } from "vitest";
import {
  accountBalances,
  groupByDay,
  isGivingCategory,
  leafAccounts,
  nextChildCode,
  toMovement,
  type LedgerAccount,
  type LedgerEntry,
  type LedgerLine,
} from "./domain";

const acc = (id: string, code: string, type: LedgerAccount["type"], parentId: string | null = null): LedgerAccount => ({
  id,
  code,
  name: id,
  type,
  parentId,
  isActive: true,
});

const ACCOUNTS: LedgerAccount[] = [
  acc("grupoCaixa", "1.1", "asset"),
  acc("caixa", "1.1.01", "asset", "grupoCaixa"),
  acc("banco", "1.1.02", "asset", "grupoCaixa"),
  acc("grupoReceita", "4.1", "revenue"),
  acc("dizimos", "4.1.01", "revenue", "grupoReceita"),
  acc("outras", "4.1.99", "revenue", "grupoReceita"),
  acc("luz", "5.1.03", "expense"),
];
const typeOf = new Map(ACCOUNTS.map((a) => [a.id, a.type]));

const entry = (id: string, date: string, status: LedgerEntry["status"] = "posted"): LedgerEntry => ({
  id,
  date,
  memo: "",
  status,
  fundId: null,
});
const pair = (entryId: string, debitId: string, creditId: string, amount: number): LedgerLine[] => [
  { entryId, accountId: debitId, debit: amount, credit: 0 },
  { entryId, accountId: creditId, debit: 0, credit: amount },
];

describe("toMovement", () => {
  it("reconhece entrada, saída e transferência pelas contas", () => {
    expect(toMovement(entry("a", "2026-10-01"), pair("a", "banco", "dizimos", 100), typeOf)).toMatchObject({
      kind: "in",
      amount: 100,
      accountId: "banco",
      counterId: "dizimos",
    });
    expect(toMovement(entry("b", "2026-10-01"), pair("b", "luz", "banco", 30.5), typeOf)).toMatchObject({
      kind: "out",
      accountId: "banco",
      counterId: "luz",
    });
    expect(toMovement(entry("c", "2026-10-01"), pair("c", "caixa", "banco", 20), typeOf)).toMatchObject({
      kind: "transfer",
      accountId: "banco",
      counterId: "caixa",
    });
  });

  it("lançamento manual fora do padrão vira 'other'", () => {
    const lines = [...pair("d", "banco", "dizimos", 50), { entryId: "d", accountId: "outras", debit: 0, credit: 1 }];
    expect(toMovement(entry("d", "2026-10-01"), lines, typeOf).kind).toBe("other");
  });
});

describe("accountBalances", () => {
  const entries = [entry("a", "2026-09-30"), entry("b", "2026-10-02"), entry("c", "2026-10-03"), entry("x", "2026-10-03", "void")];
  const lines = [
    ...pair("a", "banco", "dizimos", 100),
    ...pair("b", "luz", "banco", 30.5),
    ...pair("c", "caixa", "banco", 20),
    ...pair("x", "banco", "dizimos", 999),
  ];

  it("soma só postados e lista todas as contas finais de caixa", () => {
    expect(accountBalances(ACCOUNTS, entries, lines)).toEqual([
      { id: "caixa", name: "caixa", balance: 20 },
      { id: "banco", name: "banco", balance: 49.5 },
    ]);
  });

  it("respeita a data de corte (saldo inicial do mês)", () => {
    expect(accountBalances(ACCOUNTS, entries, lines, "2026-09-30").find((b) => b.id === "banco")?.balance).toBe(100);
  });
});

describe("leafAccounts / nextChildCode", () => {
  it("só contas finais do tipo", () => {
    expect(leafAccounts(ACCOUNTS, "revenue").map((a) => a.id)).toEqual(["dizimos", "outras"]);
  });

  it("menor código livre com 2 dígitos", () => {
    expect(nextChildCode(ACCOUNTS, "4.1")).toBe("4.1.02");
    expect(nextChildCode(ACCOUNTS, "1.1")).toBe("1.1.03");
    expect(nextChildCode(ACCOUNTS, "2.1")).toBe("2.1.01");
  });
});

describe("groupByDay", () => {
  it("agrupa e ordena do mais recente", () => {
    const m = (id: string, date: string) => toMovement(entry(id, date), pair(id, "banco", "dizimos", 1), typeOf);
    const groups = groupByDay([m("a", "2026-10-01"), m("b", "2026-10-03"), m("c", "2026-10-01")]);
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ["2026-10-03", 1],
      ["2026-10-01", 2],
    ]);
  });
});

describe("isGivingCategory", () => {
  it("dízimo, oferta e doação, com ou sem acento", () => {
    expect(isGivingCategory("Dízimos")).toBe(true);
    expect(isGivingCategory("Dizimos")).toBe(true);
    expect(isGivingCategory("Ofertas")).toBe(true);
    expect(isGivingCategory("Doações")).toBe(true);
    expect(isGivingCategory("Aluguel")).toBe(false);
  });
});
