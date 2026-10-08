"use server";

// Recibos de doação. TODA ação valida `finance.manage` no servidor (o RLS m30 é a
// barreira real). Recibo por doação e declaração anual, com número sequencial
// (next_receipt_number) e SNAPSHOT imutável em donation_receipts. Registrar a doação
// agora é um lançamento de Finanças (record_transaction, spec 10).
import { revalidatePath } from "next/cache";
import { requireOrg, can, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import type { Json } from "@/lib/database.types";
import { buildReceiptSnapshot } from "./receipt";
import { getDonation, listDonorYear, loadGivingFiscal } from "./queries";
import type { ReceiptDonorBlock, ReceiptLine, ReceiptSnapshot } from "./types";

const DENIED = "Você não tem permissão para gerir doações.";

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
  revalidatePath("/finance");
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
