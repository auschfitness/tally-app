// Domínio PURO do Giving/Doações (Fase 1). Sem I/O, determinístico, testável:
// rótulos de método, agregações (por fundo, por doador) e somatórios. As regras de
// recibo (país BR/US, texto legal) vivem em receipt.ts.
import type { Donation, DonationMethod } from "./types";

export const DONATION_METHODS: { key: DonationMethod; label: string }[] = [
  { key: "dinheiro", label: "Dinheiro" },
  { key: "pix", label: "Pix" },
  { key: "cartao", label: "Cartão" },
  { key: "transferencia", label: "Transferência" },
  { key: "cheque", label: "Cheque" },
  { key: "outro", label: "Outro" },
];

const METHOD_LABEL = new Map(DONATION_METHODS.map((m) => [m.key, m.label]));

export function methodLabel(m: string): string {
  return METHOD_LABEL.get(m as DonationMethod) ?? "Outro";
}

export function asMethod(v: string): DonationMethod {
  return METHOD_LABEL.has(v as DonationMethod) ? (v as DonationMethod) : "outro";
}

export function sumDonations(donations: Donation[]): number {
  return donations.reduce((a, d) => a + (d.amount || 0), 0);
}

// Total por fundo (designação), maior primeiro. Fundo vazio → "Geral".
export interface FundTotal {
  fund: string;
  total: number;
}
export function totalsByFund(donations: Donation[]): FundTotal[] {
  const m = new Map<string, number>();
  for (const d of donations) {
    const key = d.fundName || "Geral";
    m.set(key, (m.get(key) ?? 0) + (d.amount || 0));
  }
  return [...m.entries()].map(([fund, total]) => ({ fund, total })).sort((a, b) => b.total - a.total);
}

// Chave de agrupamento de doador: Stick por id; doador digitado por nome; anônimo
// (sem stick e sem nome) cai num balde único.
export function donorKey(d: Pick<Donation, "stickId" | "donorName">): string {
  if (d.stickId) return "stick:" + d.stickId;
  const n = (d.donorName || "").trim().toLowerCase();
  return n ? "name:" + n : "__anon__";
}

export interface DonorTotal {
  key: string;
  name: string;
  stickId: string | null;
  total: number;
  count: number;
}
// Totais por doador (para a "visão do doador"), maior total primeiro.
export function donorTotals(donations: Donation[]): DonorTotal[] {
  const m = new Map<string, DonorTotal>();
  for (const d of donations) {
    const key = donorKey(d);
    const cur = m.get(key);
    if (cur) {
      cur.total += d.amount || 0;
      cur.count += 1;
    } else {
      m.set(key, {
        key,
        name: d.stickId || d.donorName ? d.donorName || "Doador" : "Anônimo",
        stickId: d.stickId,
        total: d.amount || 0,
        count: 1,
      });
    }
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

// Ano (aaaa) de uma data ISO; usado na declaração anual.
export function yearOf(dateIso: string): number | null {
  const y = Number((dateIso || "").slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
}
