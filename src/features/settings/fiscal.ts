// Dados jurídicos/fiscais (org = matriz e por campus = filial). Modelo de front +
// mapeadores puros entre as linhas do banco (org_fiscal_profiles / campus_fiscal_profiles,
// que compartilham as mesmas colunas fiscais) e o formulário. Sem I/O aqui.
// Regra de acesso é imposta no servidor (RLS + can_manage_org_fiscal); ver actions.
import type { Json } from "@/lib/database.types";

export type FiscalCountry = "BR" | "US";

export interface FiscalAddress {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string; // UF (BR) / State (US)
  zip: string; // CEP (BR) / ZIP (US)
}

export interface BankInfo {
  bank: string; // BR
  agency: string; // BR
  account: string; // BR + US
  accountType: string; // BR (corrente/poupança)
  routing: string; // US (routing number)
}

export interface FiscalProfile {
  country: FiscalCountry;
  legalName: string; // Razão social / Legal name
  tradeName: string; // Nome fantasia / DBA
  taxId: string; // CNPJ / EIN
  stateRegistration: string; // Inscrição estadual (BR)
  taxExemptStatus: string; // 501(c)(3) (US)
  address: FiscalAddress;
  bank: BankInfo;
  pixKey: string; // BR
  donationReceipts: boolean; // donation_compliance.receipts_enabled (US)
}

export const EMPTY_FISCAL: FiscalProfile = {
  country: "BR",
  legalName: "",
  tradeName: "",
  taxId: "",
  stateRegistration: "",
  taxExemptStatus: "",
  address: { street: "", number: "", district: "", city: "", state: "", zip: "" },
  bank: { bank: "", agency: "", account: "", accountType: "", routing: "" },
  pixKey: "",
  donationReceipts: false,
};

// Linha do banco que nos interessa (as duas tabelas fiscais têm estas colunas).
export interface FiscalRow {
  country: string;
  legal_name: string | null;
  trade_name: string | null;
  tax_id: string | null;
  state_registration: string | null;
  tax_exempt_status: string | null;
  fiscal_address: Json;
  bank_info: Json;
  pix_key: string | null;
  donation_compliance: Json;
}

function asObj(j: Json | null | undefined): Record<string, unknown> {
  return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : {};
}
function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Linha do banco → modelo do formulário (defaults seguros quando falta).
export function rowToProfile(row: FiscalRow | null | undefined): FiscalProfile {
  if (!row) return EMPTY_FISCAL;
  const a = asObj(row.fiscal_address);
  const b = asObj(row.bank_info);
  const d = asObj(row.donation_compliance);
  return {
    country: row.country === "US" ? "US" : "BR",
    legalName: row.legal_name ?? "",
    tradeName: row.trade_name ?? "",
    taxId: row.tax_id ?? "",
    stateRegistration: row.state_registration ?? "",
    taxExemptStatus: row.tax_exempt_status ?? "",
    address: {
      street: asStr(a.street),
      number: asStr(a.number),
      district: asStr(a.district),
      city: asStr(a.city),
      state: asStr(a.state),
      zip: asStr(a.zip),
    },
    bank: {
      bank: asStr(b.bank),
      agency: asStr(b.agency),
      account: asStr(b.account),
      accountType: asStr(b.accountType),
      routing: asStr(b.routing),
    },
    pixKey: row.pix_key ?? "",
    donationReceipts: Boolean(d.receipts_enabled),
  };
}

// FormData → modelo (fronteira de Server Action). Nunca confia em nada além dos nomes.
export function parseFiscalInput(fd: FormData): FiscalProfile {
  const s = (name: string) => String(fd.get(name) ?? "").trim();
  return {
    country: s("country") === "US" ? "US" : "BR",
    legalName: s("legalName"),
    tradeName: s("tradeName"),
    taxId: s("taxId"),
    stateRegistration: s("stateRegistration"),
    taxExemptStatus: s("taxExemptStatus"),
    address: {
      street: s("addrStreet"),
      number: s("addrNumber"),
      district: s("addrDistrict"),
      city: s("addrCity"),
      state: s("addrState"),
      zip: s("addrZip"),
    },
    bank: {
      bank: s("bankName"),
      agency: s("bankAgency"),
      account: s("bankAccount"),
      accountType: s("bankAccountType"),
      routing: s("bankRouting"),
    },
    pixKey: s("pixKey"),
    donationReceipts: fd.get("donationReceipts") === "1",
  };
}

// Modelo → colunas do banco (jsonb montados). Sem ids (o caller injeta org_id/campus_id).
export function profileToColumns(p: FiscalProfile): Omit<FiscalRow, never> {
  return {
    country: p.country,
    legal_name: p.legalName || null,
    trade_name: p.tradeName || null,
    tax_id: p.taxId || null,
    state_registration: p.stateRegistration || null,
    tax_exempt_status: p.taxExemptStatus || null,
    fiscal_address: p.address as unknown as Json,
    bank_info: p.bank as unknown as Json,
    pix_key: p.pixKey || null,
    donation_compliance: { receipts_enabled: p.donationReceipts } as unknown as Json,
  };
}
