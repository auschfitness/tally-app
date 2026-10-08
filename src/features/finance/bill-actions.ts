"use server";

// Server Actions de contas a pagar e a receber (spec 12). finance.manage no servidor; o RLS
// (m64) e as RPCs pay_bill/unpay_bill são a barreira real.
import { revalidatePath } from "next/cache";
import { requireOrg, can, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { friendlyFinanceError } from "./domain";
import { addDays, billsInScope, type Bill, type BillFrequency, type BillKind, type BillScope } from "./bills";
import { BILL_COLUMNS, SERIES_COLUMNS, extendSeries, toBill, type BillTemplate, toSeries } from "./queries";

const DENIED = "Você não tem permissão para mexer nas finanças.";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface BillInput {
  id: string | null; // null = conta nova
  kind: BillKind;
  description: string;
  amount: number;
  dueDate: string;
  categoryId: string;
  accountId: string | null;
  payee: string;
  notes: string;
  repeat: BillFrequency | null; // só na criação
  until: string | null;
}

function validate(input: BillInput): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  if (!input.description.trim()) e.description = ["Dê um nome. Ex.: Conta de luz."];
  if (!Number.isFinite(input.amount) || input.amount <= 0) e.amount = ["Informe um valor maior que zero."];
  if (!ISO_DATE.test(input.dueDate)) e.dueDate = ["Data inválida."];
  if (!input.categoryId) e.categoryId = ["Escolha a categoria."];
  if (input.until && (!ISO_DATE.test(input.until) || input.until < input.dueDate)) e.until = ["O fim precisa ser depois do primeiro vencimento."];
  return e;
}

function fields(input: BillInput): BillTemplate {
  return {
    kind: input.kind,
    description: input.description.trim(),
    amount: Math.round(input.amount * 100) / 100,
    category_id: input.categoryId,
    account_id: input.accountId || null,
    payee: input.payee.trim() || null,
    notes: input.notes.trim() || null,
  };
}

// A conta-alvo e, se for de série, as irmãs dela.
async function loadScope(supabase: DB, orgId: string, id: string): Promise<{ target: Bill; bills: Bill[] } | null> {
  const { data: row } = await supabase.from("finance_bills").select(BILL_COLUMNS).eq("org_id", orgId).eq("id", id).maybeSingle();
  if (!row) return null;
  const target = toBill(row);
  if (!target.seriesId) return { target, bills: [target] };
  const { data: rows } = await supabase.from("finance_bills").select(BILL_COLUMNS).eq("org_id", orgId).eq("series_id", target.seriesId);
  return { target, bills: (rows ?? []).map(toBill) };
}

function revalidate(): void {
  revalidatePath("/finance");
}

export async function saveBillAction(input: BillInput, scope: BillScope = "one"): Promise<ActionResult<{ id: string }>> {
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length > 0) return fail("Confira os campos.", fieldErrors);
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const data = fields(input);

  try {
    if (input.id) {
      const found = await loadScope(supabase, orgId, input.id);
      if (!found) return fail("Conta não encontrada.");
      const { target, bills } = found;
      if (target.status !== "open") return fail("Conta já paga não muda. Desfaça o pagamento antes.");
      const ids = billsInScope(bills, target, scope).map((b) => b.id);
      const upd = await supabase.from("finance_bills").update({ ...data, updated_at: new Date().toISOString() }).eq("org_id", orgId).in("id", ids);
      if (upd.error) return fail(toMessage(upd.error, "Não consegui salvar."));
      // A data muda só nesta conta: mexer no dia de uma série inteira fica para depois.
      if (input.dueDate !== target.dueDate) {
        const d = await supabase.from("finance_bills").update({ due_date: input.dueDate }).eq("id", target.id);
        if (d.error) return fail(toMessage(d.error));
      }
      revalidate();
      return ok({ id: target.id });
    }

    if (!input.repeat) {
      const { data: row, error } = await supabase.from("finance_bills").insert({ ...data, org_id: orgId, due_date: input.dueDate }).select("id").single();
      if (error || !row) return fail(toMessage(error, "Não consegui salvar."));
      revalidate();
      return ok({ id: row.id });
    }

    const { data: s, error } = await supabase
      .from("finance_bill_series")
      .insert({ org_id: orgId, frequency: input.repeat, anchor_date: input.dueDate, ends_on: input.until })
      .select(SERIES_COLUMNS)
      .single();
    if (error || !s) return fail(toMessage(error, "Não consegui salvar."));
    await extendSeries(supabase, orgId, toSeries(s), data, input.dueDate);
    const { data: first } = await supabase.from("finance_bills").select("id").eq("series_id", s.id).eq("seq", 0).maybeSingle();
    revalidate();
    return ok({ id: first?.id ?? "" });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Excluir: "esta e as próximas"/"todas" também encerram a série, para não renascerem.
export async function deleteBillAction(id: string, scope: BillScope = "one"): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const found = await loadScope(supabase, orgId, id);
  if (!found) return fail("Conta não encontrada.");
  const { target, bills } = found;
  if (target.status !== "open") return fail("Conta paga não se exclui. Desfaça o pagamento antes.");
  const doomed = billsInScope(bills, target, scope);
  const del = await supabase.from("finance_bills").delete().eq("org_id", orgId).in("id", doomed.map((b) => b.id));
  if (del.error) return fail(toMessage(del.error));
  if (scope !== "one" && target.seriesId) {
    const first = doomed.map((b) => b.dueDate).sort()[0] ?? target.dueDate;
    await supabase.from("finance_bill_series").update({ ends_on: addDays(first, -1) }).eq("id", target.seriesId);
  }
  revalidate();
  return ok(undefined);
}

export async function payBillAction(id: string, date: string, accountId: string, amount: number): Promise<ActionResult<string>> {
  if (!ISO_DATE.test(date)) return fail("Data inválida.");
  if (!accountId) return fail("Escolha a conta.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Informe um valor maior que zero.");
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { data, error } = await ctx.supabase.rpc("pay_bill", { p_bill: id, p_date: date, p_account: accountId, p_amount: amount });
  if (error || !data) return fail(friendlyFinanceError(toMessage(error, "Não consegui registrar o pagamento.")));
  revalidate();
  return ok(data);
}

export async function unpayBillAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.rpc("unpay_bill", { p_bill: id });
  if (error) return fail(friendlyFinanceError(toMessage(error, "Não consegui desfazer.")));
  revalidate();
  return ok(undefined);
}
