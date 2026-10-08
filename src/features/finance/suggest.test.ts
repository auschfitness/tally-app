import { describe, it, expect } from "vitest";
import type { BankLine, CategoryRule, LedgerAccount } from "./domain";
import { payeeKey, suggestFor, type HistoryLine } from "./suggest";

const acc = (id: string, code: string, type: LedgerAccount["type"], name = id): LedgerAccount => ({
  id,
  code,
  name,
  type,
  parentId: null,
  isActive: true,
  bankCode: null,
  isDefault: false,
  statementAcctId: null,
});
const ACCOUNTS = [
  acc("banco", "1.1.02", "asset"),
  acc("dizimos", "4.1.01", "revenue"),
  acc("ofertas", "4.1.02", "revenue"),
  acc("aluguel", "5.1.02", "expense"),
  acc("luz", "5.1.03", "expense"),
  acc("outras", "5.1.99", "expense"),
  acc("manutencao", "5.1.05", "expense"),
];
const line = (description: string, amount: number, date = "2026-10-06"): BankLine => ({ id: description, accountId: "banco", date, amount, description });

describe("payeeKey", () => {
  it("identifica o favorecido; sem palavra útil, usa a descrição sem números", () => {
    expect(payeeKey("PIX ENVIADO - JOAO DA SILVA 12/09")).toBe("joao silva");
    expect(payeeKey("TARIFA BANCARIA 0001")).toBe("tarifa bancaria");
  });
});

describe("suggestFor", () => {
  it("empresas conhecidas: Celesc é energia, Casan é água, tarifa vai para outras despesas", () => {
    expect(suggestFor(line("PAGAMENTO DE BOLETO CELESC DISTRIBUICAO", -312.4), [], [], ACCOUNTS)).toEqual({ accountId: "luz", source: "known", reason: "Celesc é energia" });
    expect(suggestFor(line("DEB AUTOMATICO CASAN", -80), [], [], ACCOUNTS)?.reason).toBe("Casan é água");
    expect(suggestFor(line("TARIFA BANCARIA CESTA", -45), [], [], ACCOUNTS)).toMatchObject({ accountId: "outras", reason: "Parece tarifa do banco" });
    // palavra dentro de outra não conta ("timbre" não é TIM)
    expect(suggestFor(line("PIX ENVIADO TIMBRE GRAFICA", -90), [], [], ACCOUNTS)).toBeNull();
    // sentido errado: entrada da Celesc (estorno) não vira despesa
    expect(suggestFor(line("ESTORNO CELESC", 20), [], [], ACCOUNTS)).toBeNull();
  });

  it("histórico: o mesmo favorecido volta com a mesma categoria; valor parecido pesa mais", () => {
    const history: HistoryLine[] = [
      { description: "PIX ENVIADO JOAO DA SILVA", amount: -150, date: "2026-09-20", counterId: "manutencao" },
      { description: "PIX ENVIADO JOAO DA SILVA", amount: -1500, date: "2026-09-05", counterId: "aluguel" },
    ];
    expect(suggestFor(line("Pix enviado - João da Silva", -1500), [], history, ACCOUNTS)).toEqual({
      accountId: "aluguel",
      source: "history",
      reason: "Como em 05/09, valor parecido",
    });
    expect(suggestFor(line("Pix enviado - João da Silva", -700), [], history, ACCOUNTS)).toMatchObject({ accountId: "manutencao", reason: "Como em 20/09" });
  });

  it("regra da pessoa vence histórico e empresas conhecidas, e traz o id para Esquecer", () => {
    const rules: CategoryRule[] = [{ id: "r1", pattern: "celesc", accountId: "manutencao" }];
    const history: HistoryLine[] = [{ description: "CELESC", amount: -300, date: "2026-09-01", counterId: "luz" }];
    expect(suggestFor(line("BOLETO CELESC", -300), rules, history, ACCOUNTS)).toEqual({
      accountId: "manutencao",
      source: "rule",
      reason: "Sua regra: celesc",
      ruleId: "r1",
    });
  });
});
