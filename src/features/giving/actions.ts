"use server";

// Server Actions de Giving/Doações (Fase 1). TODA ação valida a permissão sensível
// `finance.manage` no servidor (o RLS m30 é a barreira real). Registrar doação,
// emitir recibo por doação e declaração anual — com número sequencial
// (next_receipt_number) e SNAPSHOT imutável gravado em donation_receipts.
import { revalidatePath } from "next/cache";
import { requireOrg, can, type DB, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import type { Json } from "@/lib/database.types";
import { parseDonationInput } from "./schema";
import { buildReceiptSnapshot } from "./receipt";
import { getDonation, listDonorYear, loadGivingFiscal } from "./queries";
import type { ReceiptDonorBlock, ReceiptLine, ReceiptSnapshot } from "./types";

const DENIED = "Você não tem permissão para gerir doações.";

async function ensureFund(supabase: DB, orgId: string, name: string): Promise<string | null> {
  const n = name.trim();
  if (!n) return null;
  const found = await supabase.from("funds").select("id").eq("org_id", orgId).eq("name", n).maybeSingle();
  if (found.data) return found.data.id;
  const created = await supabase.from("funds").insert({ org_id: orgId, name: n }).select("id").single();
  return created.data?.id ?? null;
}

export async function createDonationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseDonationInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId, user } = ctx;

  try {
    const { currency } = await loadGivingFiscal(supabase, orgId);
    const d = parsed.data;

    // Fundo: novo (garante em `funds`) tem prioridade sobre o selecionado.
    const fundId = d.newFundName ? await ensureFund(supabase, orgId, d.newFundName) : d.fundId;

    // Nome do doador no snapshot: resolvido da Stick quando houver (não confia no client).
    let donorName = d.donorName;
    if (d.stickId) {
      const st = await supabase.from("sticks").select("full_name").eq("id", d.stickId).maybeSingle();
      donorName = st.data?.full_name ?? d.donorName;
    }

    const { data: inserted, error } = await supabase
      .from("donations")
      .insert({
        org_id: orgId,
        stick_id: d.stickId,
        donor_name: donorName || null,
        donor_tax_id: d.donorTaxId || null,
        fund_id: fundId,
        amount: d.amount,
        currency,
        method: d.method,
        note: d.note || null,
        goods_services_provided: d.goodsProvided,
        goods_services_description: d.goodsProvided ? d.goodsDescription || null : null,
        goods_services_value: d.goodsProvided ? d.goodsValue : null,
        created_by: user.id,
        ...(d.date ? { donation_date: d.date } : {}),
      })
      .select("id")
      .single();

    if (error) return fail(toMessage(error, "Não consegui registrar a doação."));

    // DNA #4: toda ação vira história. Só quando há Stick — e sem expor o valor na
    // timeline (dado sensível de giving; o valor vive no ledger gated).
    if (d.stickId && inserted?.id) {
      await supabase.from("timeline_events").insert({
        org_id: orgId,
        stick_id: d.stickId,
        event_type: "donation_recorded",
        source_module: "giving",
        source_record_id: inserted.id,
        title: "Doação registrada",
        summary: d.newFundName || d.fundId ? "Contribuição designada a um fundo" : "Contribuição registrada",
        occurred_at: new Date().toISOString(),
      });
    }

    revalidatePath("/giving");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Insere o recibo (número + snapshot) e devolve o id. Compartilhado por gift/annual.
async function insertReceipt(
  ctx: OrgContext,
  params: {
    kind: "gift" | "annual";
    donationId: string | null;
    stickId: string | null;
    periodYear: number | null;
    donor: ReceiptDonorBlock;
    lines: ReceiptLine[];
  },
): Promise<ActionResult<{ receiptId: string }>> {
  const { supabase, orgId, user } = ctx;
  const fiscal = await loadGivingFiscal(supabase, orgId);

  const numRes = await supabase.rpc("next_receipt_number", { p_org: orgId });
  if (numRes.error || !numRes.data) return fail(toMessage(numRes.error, "Não consegui gerar o número do recibo."));

  const snapshot: ReceiptSnapshot = buildReceiptSnapshot({
    country: fiscal.country,
    kind: params.kind,
    receiptNo: numRes.data,
    issuedAt: new Date().toISOString(),
    currency: fiscal.currency,
    periodYear: params.periodYear,
    org: fiscal.org,
    donor: params.donor,
    lines: params.lines,
  });

  const { data, error } = await supabase
    .from("donation_receipts")
    .insert({
      org_id: orgId,
      kind: params.kind,
      donation_id: params.donationId,
      stick_id: params.stickId,
      period_year: params.periodYear,
      receipt_no: numRes.data,
      country: fiscal.country,
      total_amount: snapshot.total,
      currency: fiscal.currency,
      snapshot: snapshot as unknown as Json,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return fail(toMessage(error, "Não consegui emitir o recibo."));
  revalidatePath("/giving");
  return ok({ receiptId: data.id });
}

export async function issueGiftReceipt(donationId: string): Promise<ActionResult<{ receiptId: string }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);

  try {
    const d = await getDonation(ctx.supabase, ctx.orgId, donationId);
    if (!d) return fail("Doação não encontrada.");

    const donor: ReceiptDonorBlock = { stickId: d.stickId, name: d.donorName || "Doador anônimo", taxId: d.donorTaxId };
    const lines: ReceiptLine[] = [
      { date: d.date, fundName: d.fundName || "Geral", method: d.method, amount: d.amount, goods: d.goods },
    ];
    return await insertReceipt(ctx, { kind: "gift", donationId, stickId: d.stickId, periodYear: null, donor, lines });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function issueAnnualReceipt(input: {
  stickId: string | null;
  donorName: string;
  year: number;
}): Promise<ActionResult<{ receiptId: string }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);

  try {
    const donations = await listDonorYear(ctx.supabase, ctx.orgId, { stickId: input.stickId, donorName: input.donorName }, input.year);
    if (donations.length === 0) return fail("Sem doações desse doador no ano.");

    const first = donations[0]!;
    const donor: ReceiptDonorBlock = {
      stickId: input.stickId,
      name: input.stickId ? first.donorName || "Doador" : input.donorName || "Doador",
      taxId: first.donorTaxId,
    };
    const lines: ReceiptLine[] = donations
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, fundName: d.fundName || "Geral", method: d.method, amount: d.amount, goods: d.goods }));

    return await insertReceipt(ctx, {
      kind: "annual",
      donationId: null,
      stickId: input.stickId,
      periodYear: input.year,
      donor,
      lines,
    });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function deleteDonationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return;
  await ctx.supabase.from("donations").delete().eq("id", id);
  revalidatePath("/giving");
}
