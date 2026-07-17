// Consultas de Giving/Doações. RLS (m30) já restringe a quem tem finance.manage —
// o filtro explícito por org_id é defesa em profundidade. Doações, fundos, doadores
// (Sticks), bloco fiscal da org (p/ recibo) e recibos emitidos.
import type { DB } from "@/lib/auth/session";
import { rowToProfile } from "@/features/settings/fiscal";
import { formatAddress } from "./receipt";
import { asMethod } from "./domain";
import type { Country, Donation, Donor, Fund, ReceiptListItem, ReceiptOrgBlock, ReceiptSnapshot } from "./types";

export async function listFunds(supabase: DB, orgId: string): Promise<Fund[]> {
  const { data } = await supabase.from("funds").select("id, name").eq("org_id", orgId).order("name");
  return (data ?? []).map((f) => ({ id: f.id, name: f.name }));
}

export async function listDonors(supabase: DB, orgId: string): Promise<Donor[]> {
  const { data } = await supabase
    .from("sticks")
    .select("id, full_name")
    .eq("org_id", orgId)
    .eq("archived", false)
    .order("full_name");
  return (data ?? []).map((s) => ({ id: s.id, name: s.full_name }));
}

export async function listDonations(supabase: DB, orgId: string): Promise<Donation[]> {
  const [donRes, fundsRes, sticksRes] = await Promise.all([
    supabase
      .from("donations")
      .select(
        "id, stick_id, donor_name, donor_tax_id, fund_id, amount, currency, method, donation_date, note, goods_services_provided, goods_services_description, goods_services_value",
      )
      .eq("org_id", orgId)
      .order("donation_date", { ascending: false }),
    supabase.from("funds").select("id, name").eq("org_id", orgId),
    supabase.from("sticks").select("id, full_name").eq("org_id", orgId),
  ]);

  if (donRes.error) throw new Error(donRes.error.message);

  const fundById = new Map<string, string>();
  for (const f of fundsRes.data ?? []) fundById.set(f.id, f.name);
  const stickById = new Map<string, string>();
  for (const s of sticksRes.data ?? []) stickById.set(s.id, s.full_name);

  return (donRes.data ?? []).map((r): Donation => ({
    id: r.id,
    stickId: r.stick_id,
    donorName: r.donor_name ?? (r.stick_id ? stickById.get(r.stick_id) ?? "" : ""),
    donorTaxId: r.donor_tax_id ?? "",
    fundId: r.fund_id,
    fundName: (r.fund_id && fundById.get(r.fund_id)) || "",
    amount: Number(r.amount) || 0,
    currency: r.currency ?? "BRL",
    method: asMethod(r.method),
    date: r.donation_date ?? "",
    note: r.note ?? "",
    goods: {
      provided: Boolean(r.goods_services_provided),
      description: r.goods_services_description ?? "",
      value: r.goods_services_value != null ? Number(r.goods_services_value) : null,
    },
  }));
}

// Uma doação (para emitir recibo por doação), já com fundo/doador resolvidos.
export async function getDonation(supabase: DB, orgId: string, id: string): Promise<Donation | null> {
  const { data: r } = await supabase
    .from("donations")
    .select(
      "id, stick_id, donor_name, donor_tax_id, fund_id, amount, currency, method, donation_date, note, goods_services_provided, goods_services_description, goods_services_value",
    )
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!r) return null;

  let fundName = "";
  if (r.fund_id) {
    const f = await supabase.from("funds").select("name").eq("id", r.fund_id).maybeSingle();
    fundName = f.data?.name ?? "";
  }
  let donorName = r.donor_name ?? "";
  if (!donorName && r.stick_id) {
    const st = await supabase.from("sticks").select("full_name").eq("id", r.stick_id).maybeSingle();
    donorName = st.data?.full_name ?? "";
  }

  return {
    id: r.id,
    stickId: r.stick_id,
    donorName,
    donorTaxId: r.donor_tax_id ?? "",
    fundId: r.fund_id,
    fundName,
    amount: Number(r.amount) || 0,
    currency: r.currency ?? "BRL",
    method: asMethod(r.method),
    date: r.donation_date ?? "",
    note: r.note ?? "",
    goods: {
      provided: Boolean(r.goods_services_provided),
      description: r.goods_services_description ?? "",
      value: r.goods_services_value != null ? Number(r.goods_services_value) : null,
    },
  };
}

// Doações de UM doador num ANO (declaração anual). Doador por Stick (preferido) ou
// por nome digitado (stick nulo).
export async function listDonorYear(
  supabase: DB,
  orgId: string,
  donor: { stickId: string | null; donorName: string },
  year: number,
): Promise<Donation[]> {
  const all = await listDonations(supabase, orgId);
  const name = donor.donorName.trim().toLowerCase();
  return all.filter((d) => {
    if ((d.date || "").slice(0, 4) !== String(year)) return false;
    if (donor.stickId) return d.stickId === donor.stickId;
    return !d.stickId && (d.donorName || "").trim().toLowerCase() === name;
  });
}

export interface GivingFiscal {
  country: Country;
  currency: string;
  orgName: string;
  org: ReceiptOrgBlock;
}

// Bloco fiscal para renderizar recibos: país (dita layout), moeda, e os dados da
// org (org_fiscal_profiles + organizations.name), já formatados.
export async function loadGivingFiscal(supabase: DB, orgId: string): Promise<GivingFiscal> {
  const [orgRes, profRes] = await Promise.all([
    supabase.from("organizations").select("name, currency, country").eq("id", orgId).maybeSingle(),
    supabase.from("org_fiscal_profiles").select("*").eq("org_id", orgId).maybeSingle(),
  ]);

  const country: Country = orgRes.data?.country === "US" ? "US" : "BR";
  const profile = rowToProfile(profRes.data);
  const org: ReceiptOrgBlock = {
    name: orgRes.data?.name ?? "",
    legalName: profile.legalName,
    taxId: profile.taxId,
    taxExemptStatus: profile.taxExemptStatus,
    stateRegistration: profile.stateRegistration,
    addressText: formatAddress(profile.address, country),
  };

  return { country, currency: orgRes.data?.currency ?? (country === "US" ? "USD" : "BRL"), orgName: org.name, org };
}

export async function listReceipts(supabase: DB, orgId: string): Promise<ReceiptListItem[]> {
  const { data } = await supabase
    .from("donation_receipts")
    .select("id, kind, receipt_no, donation_id, stick_id, period_year, country, total_amount, currency, snapshot, issued_at")
    .eq("org_id", orgId)
    .order("issued_at", { ascending: false });

  return (data ?? []).map((r): ReceiptListItem => {
    const snap = r.snapshot as unknown as ReceiptSnapshot | null;
    return {
      id: r.id,
      kind: r.kind === "annual" ? "annual" : "gift",
      receiptNo: r.receipt_no,
      donorName: snap?.donor?.name ?? "Doador",
      total: Number(r.total_amount) || 0,
      currency: r.currency ?? "BRL",
      country: r.country === "US" ? "US" : "BR",
      periodYear: r.period_year,
      issuedAt: r.issued_at,
      donationId: r.donation_id,
    };
  });
}

// Recibo único (para a página de impressão) — relido do SNAPSHOT (imutável).
export async function getReceipt(
  supabase: DB,
  orgId: string,
  id: string,
): Promise<{ snapshot: ReceiptSnapshot; receiptNo: string; issuedAt: string } | null> {
  const { data } = await supabase
    .from("donation_receipts")
    .select("receipt_no, issued_at, snapshot")
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    snapshot: data.snapshot as unknown as ReceiptSnapshot,
    receiptNo: data.receipt_no,
    issuedAt: data.issued_at,
  };
}
