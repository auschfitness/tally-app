"use server";

// Server Actions de Finanças. Tudo passa por finance.manage no servidor; o banco
// (record_transaction / void_journal_entry, RLS m48) é a barreira real.
import { revalidatePath } from "next/cache";
import { requireOrg, can } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { friendlyFinanceError, nextChildCode, PARENT_CODE, type LedgerAccount, type TxKind } from "./domain";
import { parseTransactionInput } from "./schema";
import { ACCOUNT_COLUMNS, toLedgerAccount } from "./queries";

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
  // Linha do extrato que tinha virado este lançamento volta para "a classificar".
  await ctx.supabase.from("bank_transactions").update({ status: "pending", journal_entry_id: null }).eq("org_id", ctx.orgId).eq("journal_entry_id", entryId);
  // Conta a pagar que tinha virado este lançamento volta a ficar aberta (spec 12).
  await ctx.supabase.from("finance_bills").update({ status: "open", paid_on: null, paid_amount: null, journal_entry_id: null }).eq("org_id", ctx.orgId).eq("journal_entry_id", entryId);
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
    const { data: rows } = await supabase.from("ledger_accounts").select(ACCOUNT_COLUMNS).eq("org_id", orgId);
    const accounts: LedgerAccount[] = (rows ?? []).map(toLedgerAccount);
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

export interface BankAccountInput {
  id: string | null; // null = conta nova
  bankCode: string | null;
  name: string;
  openingBalance: number;
  openingDate: string;
  isDefault: boolean;
}

// Conta bancária (spec 11): nasce sob 1.1 com o banco escolhido; saldo inicial e conta
// padrão vão pelas RPCs do m62, que garantem uma padrão só e um saldo inicial por conta.
export async function saveBankAccountAction(input: BankAccountInput): Promise<ActionResult<{ id: string }>> {
  const name = input.name.trim();
  if (!name) return fail("Dê um nome para a conta.");
  if (!Number.isFinite(input.openingBalance)) return fail("Saldo inicial inválido.");
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;

  try {
    let id = input.id;
    if (id) {
      const { error } = await supabase.from("ledger_accounts").update({ name, bank_code: input.bankCode }).eq("org_id", orgId).eq("id", id).eq("type", "asset");
      if (error) return fail(toMessage(error, "Não consegui salvar a conta."));
    } else {
      const { data: rows } = await supabase.from("ledger_accounts").select(ACCOUNT_COLUMNS).eq("org_id", orgId);
      const accounts = (rows ?? []).map(toLedgerAccount);
      const parent = accounts.find((a) => a.code === PARENT_CODE.transfer);
      if (!parent) return fail("O plano de contas não tem o grupo Caixa e Bancos. Peça ao contador para criar a conta.");
      const { data, error } = await supabase
        .from("ledger_accounts")
        .insert({ org_id: orgId, code: nextChildCode(accounts, parent.code), name, type: "asset", parent_id: parent.id, bank_code: input.bankCode })
        .select("id")
        .single();
      if (error || !data) return fail(toMessage(error, "Não consegui criar a conta."));
      id = data.id;
    }

    const opening = await supabase.rpc("set_opening_balance", {
      p_org: orgId,
      p_account: id,
      p_amount: input.openingBalance,
      p_date: input.openingDate,
    });
    if (opening.error) return fail(friendlyFinanceError(toMessage(opening.error, "Não consegui lançar o saldo inicial.")));

    const { data: current } = await supabase.from("ledger_accounts").select("is_default").eq("id", id).maybeSingle();
    if (input.isDefault !== Boolean(current?.is_default)) {
      const res = await supabase.rpc("set_default_account", { p_org: orgId, ...(input.isDefault ? { p_account: id } : {}) });
      if (res.error) return fail(friendlyFinanceError(toMessage(res.error)));
    }

    revalidateFinance();
    return ok({ id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function setDefaultAccountAction(accountId: string | null): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.rpc("set_default_account", { p_org: ctx.orgId, ...(accountId ? { p_account: accountId } : {}) });
  if (error) return fail(friendlyFinanceError(toMessage(error)));
  revalidateFinance();
  return ok(undefined);
}

// Desativar só com saldo zero: esconder uma conta com dinheiro faria o saldo da igreja mentir.
export async function deactivateAccountAction(accountId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { data: rows, error } = await ctx.supabase.rpc("trial_balance", { p_org: ctx.orgId });
  if (error) return fail(toMessage(error));
  const row = (rows ?? []).find((r) => r.account_id === accountId);
  if (!row || row.type !== "asset") return fail("Conta não encontrada.");
  if (Math.abs(Number(row.balance)) >= 0.005) return fail("Zere o saldo antes de desativar (transfira para outra conta).");
  const res = await ctx.supabase.from("ledger_accounts").update({ is_active: false, is_default: false }).eq("org_id", ctx.orgId).eq("id", accountId);
  if (res.error) return fail(toMessage(res.error));
  revalidateFinance();
  return ok(undefined);
}
