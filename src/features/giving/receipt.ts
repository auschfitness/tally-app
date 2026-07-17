// Regras PURAS de recibo de doação (Fase 1), dirigidas pelo PAÍS da organização
// (organizations.country). Sem I/O. O texto legal e o layout mudam por país:
//  - BR: nome + CPF do doador, CNPJ da igreja; doação NÃO é dedutível no IR (registro).
//  - US (501c3): nome/EIN da org + frase de bens/serviços; dedutível p/ o doador.
// A action injeta receiptNo (next_receipt_number) e issuedAt; aqui é tudo determinístico.
// Ver docs/handoffs/giving-fase1.md (pesquisa do orquestrador).
import { money } from "@/lib/utils/money";
import type {
  Country,
  GoodsServices,
  ReceiptDonorBlock,
  ReceiptLine,
  ReceiptOrgBlock,
  ReceiptSnapshot,
} from "./types";

interface AddrLike {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zip: string;
}

// Endereço fiscal → uma linha legível (partes vazias somem). Dirigido pelo país.
export function formatAddress(a: AddrLike, country: Country): string {
  const street = [a.street, a.number].filter(Boolean).join(", ");
  const cityLine = country === "BR"
    ? [a.city, a.state].filter(Boolean).join("/")
    : [a.city, a.state].filter(Boolean).join(", ");
  return [street, a.district, cityLine, a.zip].filter(Boolean).join(" · ");
}

// Frase de bens/serviços (US quid pro quo) para UMA doação.
function usGiftGoodsPhrase(goods: GoodsServices, currency: string): string {
  if (!goods.provided) {
    return "No goods or services were provided in exchange for this contribution.";
  }
  const val = goods.value != null && goods.value > 0 ? ` (estimated value ${money(goods.value, currency)})` : "";
  const desc = goods.description || "goods or services";
  return (
    `In exchange for this contribution, the following goods or services were provided: ${desc}${val}. ` +
    "The tax-deductible amount is limited to the excess of the contribution over the value of the goods or services received."
  );
}

// Texto legal principal, por país + tipo de recibo.
export function buildLegalText(
  country: Country,
  kind: "gift" | "annual",
  lines: ReceiptLine[],
  currency: string,
): string {
  if (country === "BR") {
    return (
      "Contribuições e doações a entidades religiosas não são dedutíveis do Imposto de Renda. " +
      "Este recibo serve como registro e comprovação de transparência."
    );
  }
  // US
  if (kind === "gift") {
    return usGiftGoodsPhrase(lines[0]?.goods ?? { provided: false, description: "", value: null }, currency);
  }
  const anyGoods = lines.some((l) => l.goods.provided);
  return anyGoods
    ? "Some contributions during this period included goods or services provided in exchange; see the individual receipts for details."
    : "No goods or services were provided in exchange for these contributions.";
}

// Nota complementar (só US): status 501c3/EIN + limiar de US$250.
export function buildDeductibilityNote(country: Country, org: ReceiptOrgBlock): string {
  if (country !== "US") return "";
  const status = org.taxExemptStatus ? ` Status: ${org.taxExemptStatus}.` : "";
  const ein = org.taxId ? ` EIN: ${org.taxId}.` : "";
  return (
    "This organization is recognized as tax-exempt under IRC 501(c)(3)." +
    status +
    ein +
    " Contributions of $250 or more require this written acknowledgment for federal tax purposes."
  );
}

export interface BuildSnapshotParams {
  country: Country;
  kind: "gift" | "annual";
  receiptNo: string;
  issuedAt: string;
  currency: string;
  periodYear: number | null;
  org: ReceiptOrgBlock;
  donor: ReceiptDonorBlock;
  lines: ReceiptLine[];
}

// Monta o snapshot imutável do recibo (o que fica congelado no banco).
export function buildReceiptSnapshot(p: BuildSnapshotParams): ReceiptSnapshot {
  const total = p.lines.reduce((a, l) => a + (l.amount || 0), 0);
  return {
    country: p.country,
    kind: p.kind,
    receiptNo: p.receiptNo,
    issuedAt: p.issuedAt,
    periodYear: p.periodYear,
    currency: p.currency,
    total,
    org: p.org,
    donor: p.donor,
    lines: p.lines,
    legalText: buildLegalText(p.country, p.kind, p.lines, p.currency),
    deductibilityNote: buildDeductibilityNote(p.country, p.org),
  };
}
