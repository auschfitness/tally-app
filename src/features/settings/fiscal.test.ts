import { describe, it, expect } from "vitest";
import { rowToProfile, parseFiscalInput, profileToColumns, EMPTY_FISCAL, type FiscalRow } from "./fiscal";

describe("fiscal mappers", () => {
  it("rowToProfile: linha nula → perfil vazio (BR default)", () => {
    expect(rowToProfile(null)).toEqual(EMPTY_FISCAL);
    expect(rowToProfile(undefined).country).toBe("BR");
  });

  it("rowToProfile: lê jsonb com segurança e normaliza país", () => {
    const row: FiscalRow = {
      country: "US",
      legal_name: "Central Church",
      trade_name: null,
      tax_id: "12-3456789",
      state_registration: null,
      tax_exempt_status: "501(c)(3)",
      fiscal_address: { street: "5th Ave", city: "NYC", state: "NY", zip: "10001" },
      bank_info: { routing: "021000021", account: "999" },
      pix_key: null,
      donation_compliance: { receipts_enabled: true },
    };
    const p = rowToProfile(row);
    expect(p.country).toBe("US");
    expect(p.legalName).toBe("Central Church");
    expect(p.tradeName).toBe(""); // null → ""
    expect(p.taxExemptStatus).toBe("501(c)(3)");
    expect(p.address.street).toBe("5th Ave");
    expect(p.address.number).toBe(""); // ausente no jsonb
    expect(p.bank.routing).toBe("021000021");
    expect(p.donationReceipts).toBe(true);
  });

  it("rowToProfile: país inválido cai para BR; jsonb não-objeto é ignorado", () => {
    const row = { ...baseRow(), country: "XX", fiscal_address: "lixo" as unknown as FiscalRow["fiscal_address"] };
    const p = rowToProfile(row);
    expect(p.country).toBe("BR");
    expect(p.address.city).toBe("");
  });

  it("parseFiscalInput → profileToColumns: round-trip preserva os campos", () => {
    const fd = new FormData();
    fd.set("country", "BR");
    fd.set("legalName", "Igreja X");
    fd.set("taxId", "00.000.000/0001-00");
    fd.set("addrCity", "São Paulo");
    fd.set("bankName", "Banco Y");
    fd.set("pixKey", "chave@pix");
    fd.set("donationReceipts", "1");

    const p = parseFiscalInput(fd);
    expect(p.country).toBe("BR");
    expect(p.legalName).toBe("Igreja X");
    expect(p.address.city).toBe("São Paulo");
    expect(p.donationReceipts).toBe(true);

    const cols = profileToColumns(p);
    expect(cols.legal_name).toBe("Igreja X");
    expect(cols.tax_id).toBe("00.000.000/0001-00");
    expect(cols.trade_name).toBe(null); // vazio → null
    expect(cols.pix_key).toBe("chave@pix");
    expect((cols.fiscal_address as Record<string, unknown>).city).toBe("São Paulo");
    expect((cols.donation_compliance as Record<string, unknown>).receipts_enabled).toBe(true);
  });

  it("parseFiscalInput: sem checkbox → donationReceipts false", () => {
    const fd = new FormData();
    fd.set("country", "US");
    expect(parseFiscalInput(fd).donationReceipts).toBe(false);
  });
});

function baseRow(): FiscalRow {
  return {
    country: "BR",
    legal_name: null,
    trade_name: null,
    tax_id: null,
    state_registration: null,
    tax_exempt_status: null,
    fiscal_address: {},
    bank_info: {},
    pix_key: null,
    donation_compliance: {},
  };
}
