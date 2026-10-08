import { describe, it, expect } from "vitest";
import {
  accountBalances,
  groupByDay,
  isGivingCategory,
  leafAccounts,
  monthBounds,
  monthClose,
  OPENING_REFERENCE,
  findManualMatch,
  guessRulePattern,
  suggestCategory,
  type BankLine,
  type CategoryRule,
  type Movement,
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
  bankCode: null,
  isDefault: false,
  statementAcctId: null,
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
  reference: "",
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

describe("monthBounds", () => {
  it("dia anterior ao mês e último dia, inclusive fevereiro e virada de ano", () => {
    expect(monthBounds("2026-10")).toEqual({ before: "2026-09-30", last: "2026-10-31" });
    expect(monthBounds("2028-02")).toEqual({ before: "2028-01-31", last: "2028-02-29" });
    expect(monthBounds("2027-01")).toEqual({ before: "2026-12-31", last: "2027-01-31" });
  });
});

describe("monthClose", () => {
  it("inicial + entradas − saídas + outros = final, por categoria e por conta", () => {
    const entries = [entry("a", "2026-09-20"), entry("b", "2026-10-02"), entry("c", "2026-10-05"), entry("d", "2026-10-06"), entry("e", "2026-10-07")];
    const lines = [
      ...pair("a", "banco", "dizimos", 500),
      ...pair("b", "banco", "dizimos", 100),
      ...pair("c", "luz", "banco", 40),
      ...pair("d", "caixa", "banco", 60),
      // ajuste manual do contador: tira 10 do caixa contra uma conta de receita, com 3 partidas
      { entryId: "e", accountId: "outras", debit: 10, credit: 0 },
      { entryId: "e", accountId: "caixa", debit: 0, credit: 6 },
      { entryId: "e", accountId: "caixa", debit: 0, credit: 4 },
    ];
    const movements = entries.map((e) => toMovement(e, lines.filter((l) => l.entryId === e.id), typeOf));
    const r = monthClose("2026-10", ACCOUNTS, entries, lines, movements);
    expect(r).toMatchObject({ opening: 500, income: 100, expense: 40, other: -10, closing: 550 });
    expect(r.incomeByCategory).toEqual([{ id: "dizimos", total: 100 }]);
    expect(r.expenseByCategory).toEqual([{ id: "luz", total: 40 }]);
    expect(r.accounts).toEqual([
      { id: "caixa", name: "caixa", opening: 0, closing: 50 },
      { id: "banco", name: "banco", opening: 500, closing: 500 },
    ]);
  });
});

describe("saldo inicial (opening)", () => {
  const opening = (id: string, date: string): LedgerEntry => ({ ...entry(id, date), reference: OPENING_REFERENCE });
  const equity: LedgerAccount = { ...acc("saldoAcumulado", "3.1.01", "equity") };
  const types = new Map([...typeOf, [equity.id, equity.type]]);

  it("toMovement reconhece saldo inicial positivo e negativo pela conta de caixa", () => {
    expect(toMovement(opening("o1", "2026-10-01"), pair("o1", "banco", "saldoAcumulado", 300), types)).toMatchObject({ kind: "opening", amount: 300, accountId: "banco" });
    expect(toMovement(opening("o2", "2026-10-01"), pair("o2", "saldoAcumulado", "caixa", 50), types)).toMatchObject({ kind: "opening", amount: -50, accountId: "caixa" });
  });

  it("monthClose separa o saldo inicial lançado no mês de 'outros'", () => {
    const entries = [opening("o1", "2026-10-01"), entry("b", "2026-10-02")];
    const lines = [...pair("o1", "banco", "saldoAcumulado", 300), ...pair("b", "banco", "dizimos", 100)];
    const movements = entries.map((e) => toMovement(e, lines.filter((l) => l.entryId === e.id), types));
    expect(monthClose("2026-10", [...ACCOUNTS, equity], entries, lines, movements)).toMatchObject({ opening: 0, openingSet: 300, income: 100, other: 0, closing: 400 });
  });
});

describe("classificação do extrato", () => {
  const line = (p: Partial<BankLine>): BankLine => ({ id: "l1", accountId: "banco", date: "2026-10-06", amount: -189.9, description: "PAGAMENTO DE BOLETO - CEMIG 0123", ...p });

  it("suggestCategory: casa sem acento, respeita o sinal e prefere o trecho mais longo", () => {
    const rules: CategoryRule[] = [
      { id: "r1", pattern: "cemig", accountId: "luz" },
      { id: "r2", pattern: "pix", accountId: "dizimos" },
      { id: "r3", pattern: "pix recebido maria", accountId: "outras" },
    ];
    expect(suggestCategory(line({}), rules, ACCOUNTS)).toBe("luz");
    expect(suggestCategory(line({ amount: 50, description: "Pix recebido MARIA" }), rules, ACCOUNTS)).toBe("outras");
    expect(suggestCategory(line({ amount: 50, description: "PIX RECEBIDO JOÃO" }), rules, ACCOUNTS)).toBe("dizimos");
    // saída com regra de receita: não sugere
    expect(suggestCategory(line({ description: "PIX ENVIADO" }), rules, ACCOUNTS)).toBeNull();
  });

  it("guessRulePattern tira ruído de banco, números e datas", () => {
    expect(guessRulePattern("PAGAMENTO DE BOLETO - CEMIG 0123")).toBe("cemig");
    expect(guessRulePattern("Pix enviado - Supermercado Bom Preço 05/10")).toBe("supermercado bom");
    expect(guessRulePattern("TARIFA BANCARIA")).toBe("");
  });

  it("findManualMatch: mesma conta, valor e sentido, até 3 dias, sem vínculo, o mais próximo vence", () => {
    const mv = (id: string, date: string, amount: number, accountId = "banco"): Movement => ({
      id, date, memo: "", kind: "out", amount, status: "posted", accountId, counterId: "luz", donor: "",
    });
    const movements = [mv("longe", "2026-10-01", 189.9), mv("perto", "2026-10-05", 189.9), mv("outraConta", "2026-10-06", 189.9, "caixa"), mv("outroValor", "2026-10-06", 190)];
    expect(findManualMatch(line({}), movements, new Set())?.id).toBe("perto");
    expect(findManualMatch(line({}), movements, new Set(["perto"]))).toBeNull();
    expect(findManualMatch(line({ amount: 189.9 }), movements, new Set())).toBeNull();
  });
});
