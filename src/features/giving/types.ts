// Modelos de front do Giving/Doações (Fase 1). Sem I/O — só as formas que a UI e o
// domínio puro usam. As linhas do banco (donations/donation_receipts) são mapeadas
// para cá nas queries. Ver docs/handoffs/giving-fase1.md.

export type Country = "BR" | "US";

// Enum de método (espelha o CHECK do banco m30). Rótulos em domain.ts.
export type DonationMethod = "dinheiro" | "pix" | "cartao" | "transferencia" | "cheque" | "outro";

export interface Fund {
  id: string;
  name: string;
}

// Stick mínima para o seletor de doador.
export interface Donor {
  id: string;
  name: string;
}

// "Bens/serviços em troca" (quid pro quo dos EUA). No BR fica sempre não-provido.
export interface GoodsServices {
  provided: boolean;
  description: string;
  value: number | null;
}

export interface Donation {
  id: string;
  stickId: string | null; // null = anônimo/avulso
  donorName: string; // nome da Stick resolvido OU nome digitado/snapshot
  donorTaxId: string; // CPF (BR), opcional
  fundId: string | null;
  fundName: string; // resolvido p/ exibição
  amount: number;
  currency: string;
  method: DonationMethod;
  date: string; // ISO aaaa-mm-dd
  note: string;
  goods: GoodsServices;
}

// Item da lista de recibos já emitidos.
export interface ReceiptListItem {
  id: string;
  kind: "gift" | "annual";
  receiptNo: string;
  donorName: string;
  total: number;
  currency: string;
  country: Country;
  periodYear: number | null;
  issuedAt: string;
  donationId: string | null;
}

// ---- Snapshot do recibo (congelado em donation_receipts.snapshot) ----
// Imutável: ao reabrir um recibo, a UI lê ISTO, não os dados atuais.

export interface ReceiptOrgBlock {
  name: string; // organizations.name
  legalName: string; // Razão social / Legal name
  taxId: string; // CNPJ / EIN
  taxExemptStatus: string; // 501(c)(3) (US)
  stateRegistration: string; // Inscrição estadual (BR)
  addressText: string; // endereço já formatado numa linha
}

export interface ReceiptDonorBlock {
  stickId: string | null;
  name: string;
  taxId: string; // CPF (BR)
}

export interface ReceiptLine {
  date: string; // ISO
  fundName: string;
  method: DonationMethod;
  amount: number;
  goods: GoodsServices;
}

export interface ReceiptSnapshot {
  country: Country;
  kind: "gift" | "annual";
  receiptNo: string;
  issuedAt: string; // ISO datetime
  periodYear: number | null; // p/ annual
  currency: string;
  total: number;
  org: ReceiptOrgBlock;
  donor: ReceiptDonorBlock;
  lines: ReceiptLine[];
  legalText: string; // frase legal já resolvida pelo país
  deductibilityNote: string; // nota complementar (US: 501c3/EIN/$250); "" quando não se aplica
}
