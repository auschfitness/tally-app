"use server";

// Server Actions de Finanças. Tudo passa por finance.manage no servidor; o banco
// (record_transaction / void_journal_entry, RLS m48) é a barreira real.
import { revalidatePath } from "next/cache";
import { requireOrg, can } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { friendlyFinanceError, nextChildCode, PARENT_CODE, type LedgerAccount, type TxKind } from "./domain";
import { parseTransactionInput } from "./schema";

const DENIED = "Você não tem permissão para mexer nas finanças.";

function revalidateFinance(): void {
  revalidatePath("/finance");
}

export async function recordTransactionAction(_prev: ActionResult<string>, formData: FormData): Promise<ActionResult<string>> {
  const parsed = parseTransactionInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const d = parsed.data;

  const { data, error } = await ctx.supabase.rpc("record_transaction", {
    p_org: ctx.orgId,
    p_kind: d.kind,
    p_amount: d.amount,
    p_date: d.date,
    p_account: d.accountId,
    p_counter: d.counterId,
    p_memo: d.memo,
    ...(d.fundId ? { p_fund: d.fundId } : {}),
    ...(d.donorStickId ? { p_donor_stick: d.donorStickId } : {}),
    ...(d.donorName ? { p_donor_name: d.donorName } : {}),
    ...(d.method ? { p_method: d.method } : {}),
  });
  if (error || !data) return fail(friendlyFinanceError(toMessage(error, "Não consegui salvar o lançamento.")));

  // DNA #4: a contribuição entra na Timeline da pessoa, sem o valor (dado sensível).
  if (d.donorStickId) {
    await ctx.supabase.from("timeline_events").insert({
      org_id: ctx.orgId,
      stick_id: d.donorStickId,
      event_type: "donation_recorded",
      source_module: "finance",
      source_record_id: data,
      title: "Contribuição registrada",
      summary: d.fundId ? "Contribuição designada a um fundo" : "Contribuição registrada",
      occurred_at: new Date().toISOString(),
    });
  }

  revalidateFinance();
  return ok(data);
}

// Desfazer/anular: o lançamento postado não se apaga, se anula (m48). A doação ligada
// some das listas porque elas ignoram lançamentos anulados.
export async function voidTransactionAction(entryId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.rpc("void_journal_entry", { p_entry: entryId });
  if (error) return fail(friendlyFinanceError(toMessage(error, "Não consegui anular o lançamento.")));
  revalidateFinance();
  return ok(undefined);
}

// Conta (kind=transfer → caixa/banco) ou categoria (in/out) nova, criada do próprio
// painel de lançamento. O código vem do próximo livre no grupo padrão do plano.
export async function createLedgerAccountAction(kind: TxKind, rawName: string): Promise<ActionResult<{ id: string; name: string }>> {
  const name = rawName.trim();
  if (!name) return fail("Dê um nome.");
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;

  try {
    const parentCode = PARENT_CODE[kind];
    const { data: rows } = await supabase.from("ledger_accounts").select("id, code, name, type, parent_id, is_active").eq("org_id", orgId);
    const accounts: LedgerAccount[] = (rows ?? []).map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      parentId: a.parent_id,
      isActive: a.is_active,
    }));
    const parent = accounts.find((a) => a.code === parentCode);
    if (!parent) return fail("O plano de contas da igreja não tem o grupo padrão. Peça ao contador para criar a conta.");

    const { data, error } = await supabase
      .from("ledger_accounts")
      .insert({ org_id: orgId, code: nextChildCode(accounts, parentCode), name, type: parent.type, parent_id: parent.id })
      .select("id, name")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar."));
    revalidateFinance();
    return ok({ id: data.id, name: data.name });
  } catch (e) {
    return fail(toMessage(e));
  }
}
