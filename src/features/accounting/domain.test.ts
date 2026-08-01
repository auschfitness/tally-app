import { describe, it, expect } from "vitest";
import {
  round2,
  compareCode,
  buildAccountTree,
  flattenTree,
  balanceEntry,
  buildIncomeStatement,
  sumSides,
  accountTypeLabel,
  statusLabel,
  friendlyAccountingError,
  ACCOUNT_TYPE_ORDER,
} from "./domain";
import type { Account, DraftLine, TrialBalanceRow } from "./types";

function acc(p: Partial<Account>): Account {
  return { id: "a", code: "1", name: "Conta", type: "asset", parentId: null, isActive: true, ...p };
}
function line(p: Partial<DraftLine>): DraftLine {
  return { accountId: "acc", debit: 0, credit: 0, description: "", ...p };
}
function tbRow(p: Partial<TrialBalanceRow>): TrialBalanceRow {
  return { accountId: "a", code: "1", name: "C", type: "asset", debit: 0, credit: 0, balance: 0, ...p };
}

describe("round2", () => {
  it("arredonda para centavos e trata lixo", () => {
    expect(round2(1.239)).toBe(1.24);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1234.5)).toBe(1234.5);
    expect(round2(NaN)).toBe(0);
  });
});

describe("compareCode", () => {
  it("ordena numericamente por segmento (1.2 antes de 1.10)", () => {
    expect(compareCode("1.2", "1.10")).toBeLessThan(0);
    expect(compareCode("1.1.02", "1.1.01")).toBeGreaterThan(0);
    expect(compareCode("2", "10")).toBeLessThan(0);
    expect(compareCode("1.1", "1.1")).toBe(0);
  });
});

describe("buildAccountTree", () => {
  const accounts: Account[] = [
    acc({ id: "asset", code: "1", name: "Ativo", type: "asset" }),
    acc({ id: "caixa-grp", code: "1.1", name: "Caixa e Bancos", type: "asset", parentId: "asset" }),
    acc({ id: "caixa", code: "1.1.01", name: "Caixa", type: "asset", parentId: "caixa-grp" }),
    acc({ id: "banco", code: "1.1.02", name: "Banco", type: "asset", parentId: "caixa-grp" }),
    acc({ id: "rev", code: "4", name: "Receitas", type: "revenue" }),
    acc({ id: "diz", code: "4.1.01", name: "Dízimos", type: "revenue", parentId: "rev" }),
    acc({ id: "exp", code: "5", name: "Despesas", type: "expense" }),
  ];

  it("agrupa por tipo na ordem contábil", () => {
    const groups = buildAccountTree(accounts);
    expect(groups.map((g) => g.type)).toEqual(["asset", "revenue", "expense"]);
    // ordem canônica é respeitada mesmo com input embaralhado
    expect(ACCOUNT_TYPE_ORDER.indexOf("asset")).toBeLessThan(ACCOUNT_TYPE_ORDER.indexOf("revenue"));
  });

  it("aninha filhas por parent_id e calcula profundidade", () => {
    const groups = buildAccountTree(accounts);
    const ativo = groups[0]!.roots[0]!;
    expect(ativo.depth).toBe(0);
    expect(ativo.children.map((c) => c.id)).toEqual(["caixa-grp"]);
    const caixaGrp = ativo.children[0]!;
    expect(caixaGrp.depth).toBe(1);
    expect(caixaGrp.children.map((c) => c.id)).toEqual(["caixa", "banco"]); // ordenado por código
    expect(caixaGrp.children[0]!.depth).toBe(2);
  });

  it("trata parent órfão (apontando para fora) como raiz", () => {
    const orphan: Account[] = [acc({ id: "x", code: "9.9", type: "expense", parentId: "sumiu" })];
    const groups = buildAccountTree(orphan);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.roots[0]!.id).toBe("x");
    expect(groups[0]!.roots[0]!.depth).toBe(0);
  });

  it("flattenTree devolve ordem hierárquica linear", () => {
    const flat = flattenTree(buildAccountTree(accounts));
    expect(flat.map((n) => n.code)).toEqual(["1", "1.1", "1.1.01", "1.1.02", "4", "4.1.01", "5"]);
  });
});

describe("balanceEntry", () => {
  it("um lançamento que fecha pode ser postado", () => {
    const r = balanceEntry([
      line({ accountId: "caixa", debit: 100 }),
      line({ accountId: "diz", credit: 100 }),
    ]);
    expect(r.debitTotal).toBe(100);
    expect(r.creditTotal).toBe(100);
    expect(r.difference).toBe(0);
    expect(r.balanced).toBe(true);
    expect(r.lineCount).toBe(2);
    expect(r.canPost).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("não fecha quando débitos ≠ créditos", () => {
    const r = balanceEntry([
      line({ accountId: "caixa", debit: 100 }),
      line({ accountId: "diz", credit: 90 }),
    ]);
    expect(r.difference).toBe(10);
    expect(r.balanced).toBe(false);
    expect(r.canPost).toBe(false);
    expect(r.errors).toContain("Os débitos e os créditos precisam bater.");
  });

  it("exige ao menos 2 partidas", () => {
    const r = balanceEntry([line({ accountId: "caixa", debit: 100 })]);
    expect(r.canPost).toBe(false);
    expect(r.errors).toContain("Um lançamento precisa de ao menos 2 partidas.");
  });

  it("rejeita valor zero (tudo vazio)", () => {
    const r = balanceEntry([line({ accountId: "caixa" }), line({ accountId: "diz" })]);
    expect(r.positive).toBe(false);
    expect(r.canPost).toBe(false);
    expect(r.errors).toContain("O valor do lançamento não pode ser zero.");
    // não acusa "não batem" quando ainda está zerado (0=0)
    expect(r.errors).not.toContain("Os débitos e os créditos precisam bater.");
  });

  it("rejeita partida com os dois lados preenchidos", () => {
    const r = balanceEntry([
      line({ accountId: "caixa", debit: 50, credit: 50 }),
      line({ accountId: "diz", credit: 50 }),
    ]);
    expect(r.canPost).toBe(false);
    expect(r.errors).toContain("Cada partida tem um lado só: débito OU crédito.");
  });

  it("acusa valor sem conta e conta sem valor", () => {
    const r = balanceEntry([
      line({ accountId: null, debit: 100 }),
      line({ accountId: "diz", credit: 0 }),
    ]);
    expect(r.errors).toContain("Escolha a conta de cada partida com valor.");
    expect(r.errors).toContain("Informe o valor de cada partida.");
    expect(r.canPost).toBe(false);
  });

  it("fecha com múltiplas partidas (rateio)", () => {
    const r = balanceEntry([
      line({ accountId: "caixa", debit: 100 }),
      line({ accountId: "diz", credit: 70 }),
      line({ accountId: "of", credit: 30 }),
    ]);
    expect(r.lineCount).toBe(3);
    expect(r.balanced).toBe(true);
    expect(r.canPost).toBe(true);
  });

  it("tolera ruído de centavo no arredondamento", () => {
    const r = balanceEntry([
      line({ accountId: "a", debit: 0.1 }),
      line({ accountId: "b", debit: 0.2 }),
      line({ accountId: "c", credit: 0.3 }),
    ]);
    expect(r.balanced).toBe(true);
    expect(r.canPost).toBe(true);
  });
});

describe("buildIncomeStatement", () => {
  const rows: TrialBalanceRow[] = [
    tbRow({ code: "1.1.01", type: "asset", debit: 200, credit: 0, balance: 200 }),
    tbRow({ code: "4", type: "revenue", debit: 0, credit: 0, balance: 0 }), // conta-pai sem movimento
    tbRow({ code: "4.1.01", name: "Dízimos", type: "revenue", debit: 0, credit: 300, balance: 300 }),
    tbRow({ code: "4.1.02", name: "Ofertas", type: "revenue", debit: 0, credit: 100, balance: 100 }),
    tbRow({ code: "5.1.02", name: "Aluguel", type: "expense", debit: 120, credit: 0, balance: 120 }),
  ];

  it("soma receitas e despesas e apura o resultado", () => {
    const dre = buildIncomeStatement(rows);
    expect(dre.revenue).toBe(400);
    expect(dre.expense).toBe(120);
    expect(dre.result).toBe(280); // superávit
  });

  it("mostra só contas com movimento (ignora pai zerado)", () => {
    const dre = buildIncomeStatement(rows);
    expect(dre.revenueRows.map((r) => r.name)).toEqual(["Dízimos", "Ofertas"]);
    expect(dre.expenseRows).toHaveLength(1);
  });

  it("resultado negativo = déficit", () => {
    const dre = buildIncomeStatement([
      tbRow({ code: "4.1", type: "revenue", credit: 50, balance: 50 }),
      tbRow({ code: "5.1", type: "expense", debit: 80, balance: 80 }),
    ]);
    expect(dre.result).toBe(-30);
  });
});

describe("sumSides", () => {
  it("soma débitos e créditos", () => {
    expect(sumSides([{ debit: 10, credit: 0 }, { debit: 0, credit: 10 }])).toEqual({ debit: 10, credit: 10 });
  });
});

describe("rótulos e erros", () => {
  it("rótulos de tipo em PT-BR", () => {
    expect(accountTypeLabel("asset")).toBe("Ativo");
    expect(accountTypeLabel("revenue")).toBe("Receitas");
  });
  it("rótulos de status em PT-BR", () => {
    expect(statusLabel("draft")).toBe("Rascunho");
    expect(statusLabel("posted")).toBe("Postado");
    expect(statusLabel("void")).toBe("Anulado");
  });
  it("traduz erros crus do banco para amigável", () => {
    expect(friendlyAccountingError("debitos (100.00) e creditos (90.00) nao batem")).toContain("não batem");
    expect(friendlyAccountingError("lancamento precisa de ao menos 2 partidas")).toContain("2 partidas");
    expect(friendlyAccountingError("lancamento com valor zero")).toContain("não pode ser zero");
    expect(friendlyAccountingError("so rascunho pode ser postado")).toContain("rascunho");
    expect(friendlyAccountingError("forbidden")).toContain("permissão");
    expect(friendlyAccountingError("lancamento nao-rascunho e imutavel (estorne via void)")).toContain("imutável");
    expect(friendlyAccountingError("mensagem desconhecida")).toBe("mensagem desconhecida");
  });
});
