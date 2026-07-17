import { describe, it, expect } from "vitest";
import { asMethod, methodLabel, sumDonations, totalsByFund, donorTotals, donorKey, yearOf } from "./domain";
import { buildReceiptSnapshot, buildLegalText, formatAddress } from "./receipt";
import type { Donation, ReceiptLine, ReceiptOrgBlock, ReceiptDonorBlock } from "./types";

function don(p: Partial<Donation>): Donation {
  return {
    id: "d",
    stickId: null,
    donorName: "",
    donorTaxId: "",
    fundId: null,
    fundName: "",
    amount: 100,
    currency: "BRL",
    method: "dinheiro",
    date: "2026-05-10",
    note: "",
    goods: { provided: false, description: "", value: null },
    ...p,
  };
}

describe("domain — métodos e somatórios", () => {
  it("rótulo e coerção de método", () => {
    expect(methodLabel("pix")).toBe("Pix");
    expect(methodLabel("qualquer")).toBe("Outro");
    expect(asMethod("cartao")).toBe("cartao");
    expect(asMethod("inexistente")).toBe("outro");
  });

  it("soma doações", () => {
    expect(sumDonations([don({ amount: 100 }), don({ amount: 50.5 })])).toBe(150.5);
    expect(sumDonations([])).toBe(0);
  });

  it("totais por fundo (fundo vazio → Geral), maior primeiro", () => {
    const t = totalsByFund([
      don({ fundName: "Missões", amount: 100 }),
      don({ fundName: "", amount: 300 }),
      don({ fundName: "Missões", amount: 50 }),
    ]);
    expect(t[0]).toEqual({ fund: "Geral", total: 300 });
    expect(t[1]).toEqual({ fund: "Missões", total: 150 });
  });
});

describe("domain — agrupamento de doador", () => {
  it("agrupa por Stick, por nome, e anônimo", () => {
    expect(donorKey(don({ stickId: "s1" }))).toBe("stick:s1");
    expect(donorKey(don({ donorName: "Maria" }))).toBe("name:maria");
    expect(donorKey(don({ donorName: "" }))).toBe("__anon__");
  });

  it("totais por doador somam e contam", () => {
    const dt = donorTotals([
      don({ stickId: "s1", donorName: "Ana", amount: 100 }),
      don({ stickId: "s1", donorName: "Ana", amount: 200 }),
      don({ donorName: "", amount: 40 }),
    ]);
    const ana = dt.find((x) => x.stickId === "s1")!;
    expect(ana.total).toBe(300);
    expect(ana.count).toBe(2);
    expect(dt.find((x) => x.key === "__anon__")!.name).toBe("Anônimo");
  });

  it("yearOf extrai o ano", () => {
    expect(yearOf("2026-05-10")).toBe(2026);
    expect(yearOf("")).toBe(null);
  });
});

const ORG: ReceiptOrgBlock = {
  name: "Igreja Teste",
  legalName: "Igreja Teste LTDA",
  taxId: "00.000.000/0001-00",
  taxExemptStatus: "",
  stateRegistration: "",
  addressText: "Rua A, 1 · Centro · São Paulo/SP",
};
const DONOR: ReceiptDonorBlock = { stickId: "s1", name: "Ana Souza", taxId: "123.456.789-00" };
const line = (p: Partial<ReceiptLine> = {}): ReceiptLine => ({
  date: "2026-05-10",
  fundName: "Geral",
  method: "pix",
  amount: 250,
  goods: { provided: false, description: "", value: null },
  ...p,
});

describe("receipt — texto legal por país", () => {
  it("BR: não dedutível, registro de transparência", () => {
    const t = buildLegalText("BR", "gift", [line()], "BRL");
    expect(t).toMatch(/não são dedutíveis/i);
  });

  it("US gift sem bens: frase padrão", () => {
    const t = buildLegalText("US", "gift", [line()], "USD");
    expect(t).toBe("No goods or services were provided in exchange for this contribution.");
  });

  it("US gift com bens: descreve e limita a dedução", () => {
    const t = buildLegalText("US", "gift", [line({ goods: { provided: true, description: "Livro", value: 20 } })], "USD");
    expect(t).toMatch(/Livro/);
    expect(t).toMatch(/estimated value/);
    expect(t).toMatch(/tax-deductible amount is limited/i);
  });

  it("US annual agrega bens/serviços", () => {
    const withGoods = buildLegalText("US", "annual", [line(), line({ goods: { provided: true, description: "X", value: 5 } })], "USD");
    expect(withGoods).toMatch(/individual receipts/i);
    const clean = buildLegalText("US", "annual", [line(), line()], "USD");
    expect(clean).toMatch(/No goods or services/i);
  });
});

describe("receipt — snapshot", () => {
  it("soma o total das linhas e resolve nota US", () => {
    const snap = buildReceiptSnapshot({
      country: "US",
      kind: "annual",
      receiptNo: "2026-000007",
      issuedAt: "2026-07-01T00:00:00Z",
      currency: "USD",
      periodYear: 2026,
      org: { ...ORG, taxId: "12-3456789", taxExemptStatus: "501(c)(3)" },
      donor: DONOR,
      lines: [line({ amount: 250 }), line({ amount: 150 })],
    });
    expect(snap.total).toBe(400);
    expect(snap.deductibilityNote).toMatch(/EIN: 12-3456789/);
    expect(snap.deductibilityNote).toMatch(/\$250 or more/);
  });

  it("BR não tem nota de dedutibilidade", () => {
    const snap = buildReceiptSnapshot({
      country: "BR",
      kind: "gift",
      receiptNo: "2026-000001",
      issuedAt: "2026-07-01T00:00:00Z",
      currency: "BRL",
      periodYear: null,
      org: ORG,
      donor: DONOR,
      lines: [line()],
    });
    expect(snap.deductibilityNote).toBe("");
  });
});

describe("receipt — endereço", () => {
  it("BR usa cidade/UF; US usa cidade, estado", () => {
    const addr = { street: "Rua A", number: "1", district: "Centro", city: "SP", state: "SP", zip: "01000" };
    expect(formatAddress(addr, "BR")).toContain("SP/SP");
    expect(formatAddress({ ...addr, city: "Dallas", state: "TX" }, "US")).toContain("Dallas, TX");
  });
});
