"use server";

// Server Actions da Contabilidade. TODA ação valida `finance.manage` no servidor
// (o RLS m48 é a barreira real). Lançamento: criar/editar rascunho, postar (RPC valida
// que fecha), estornar (void). Plano de contas: criar/editar/ativar/excluir. Imutabilidade
// do lançamento postado é garantida pelo banco (trigger); aqui só damos erro amigável.
import { revalidatePath } from "next/cache";
import { requireOrg, can } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { parseAccountInput, validateEntry, type EntryInput } from "./schema";
import { friendlyAccountingError } from "./domain";
import { accountsWithLines } from "./queries";

const DENIED = "Você não tem permissão para gerir a contabilidade.";

function revalidateAll() {
  revalidatePath("/accounting");
  revalidatePath("/accounting/accounts");
  revalidatePath("/accounting/entries");
  revalidatePath("/accounting/reports");
}

// ---------- Plano de contas ----------

export async function saveAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseAccountInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  const d = parsed.data;

  try {
    if (id) {
      const { error } = await supabase
        .from("ledger_accounts")
        .update({ code: d.code, name: d.name, type: d.type, parent_id: d.parentId })
        .eq("org_id", orgId)
        .eq("id", id);
      if (error) return fail(dbAccountMessage(error));
    } else {
      const { error } = await supabase
        .from("ledger_accounts")
        .insert({ org_id: orgId, code: d.code, name: d.name, type: d.type, parent_id: d.parentId });
      if (error) return fail(dbAccountMessage(error));
    }
    revalidateAll();
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

function dbAccountMessage(error: { message?: string } | null): string {
  const m = (error?.message ?? "").toLowerCase();
  if (m.includes("code_unique") || (m.includes("duplicate") && m.includes("code"))) return "Já existe uma conta com esse código.";
  return toMessage(error, "Não consegui salvar a conta.");
}

export async function setAccountActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.from("ledger_accounts").update({ is_active: isActive }).eq("org_id", ctx.orgId).eq("id", id);
  if (error) return fail(toMessage(error, "Não consegui atualizar a conta."));
  revalidateAll();
  return ok(undefined);
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;

  // Regra: conta com partidas não se apaga (some com histórico). Inative em vez disso.
  const used = await accountsWithLines(supabase, orgId);
  if (used.has(id)) return fail("Esta conta tem lançamentos e não pode ser apagada. Inative-a se não usar mais.");

  const { error } = await supabase.from("ledger_accounts").delete().eq("org_id", orgId).eq("id", id);
  if (error) return fail(toMessage(error, "Não consegui apagar a conta."));
  revalidateAll();
  return ok(undefined);
}

// ---------- Lançamentos ----------

// Cria ou atualiza um RASCUNHO (cabeçalho + partidas). Postado é imutável (o banco
// bloqueia edição das partidas); aqui só permitimos salvar rascunho.
export async function saveDraftEntryAction(input: EntryInput): Promise<ActionResult<{ entryId: string }>> {
  const parsed = validateEntry(input);
  if (!parsed.ok) return fail("Confira o lançamento.", parsed.fieldErrors);

  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId, user } = ctx;
  const d = parsed.data;

  try {
    let entryId = input.id;

    if (entryId) {
      // Só rascunho pode ser reescrito. Confere o status antes de mexer nas partidas.
      const cur = await supabase.from("journal_entries").select("status").eq("org_id", orgId).eq("id", entryId).maybeSingle();
      if (!cur.data) return fail("Lançamento não encontrado.");
      if (cur.data.status !== "draft") return fail("Lançamento postado é imutável. Estorne para corrigir.");

      const upd = await supabase
        .from("journal_entries")
        .update({ entry_date: d.date, memo: d.memo || null, reference: d.reference || null, fund_id: d.fundId })
        .eq("org_id", orgId)
        .eq("id", entryId);
      if (upd.error) return fail(toMessage(upd.error, "Não consegui salvar o lançamento."));

      const del = await supabase.from("journal_lines").delete().eq("org_id", orgId).eq("entry_id", entryId);
      if (del.error) return fail(friendlyAccountingError(del.error.message));
    } else {
      const ins = await supabase
        .from("journal_entries")
        .insert({ org_id: orgId, entry_date: d.date, memo: d.memo || null, reference: d.reference || null, fund_id: d.fundId, status: "draft", created_by: user.id })
        .select("id")
        .single();
      if (ins.error || !ins.data) return fail(toMessage(ins.error, "Não consegui criar o lançamento."));
      entryId = ins.data.id;
    }

    const rows = d.lines.map((l, i) => ({
      org_id: orgId,
      entry_id: entryId as string,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
      fund_id: d.fundId,
      description: l.description || null,
      line_no: i + 1,
    }));
    const insLines = await supabase.from("journal_lines").insert(rows);
    if (insLines.error) return fail(friendlyAccountingError(insLines.error.message));

    revalidateAll();
    return ok({ entryId: entryId as string });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function postEntryAction(entryId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.rpc("post_journal_entry", { p_entry: entryId });
  if (error) return fail(friendlyAccountingError(error.message));
  revalidateAll();
  return ok(undefined);
}

export async function voidEntryAction(entryId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.rpc("void_journal_entry", { p_entry: entryId });
  if (error) return fail(friendlyAccountingError(error.message));
  revalidateAll();
  return ok(undefined);
}

export async function deleteDraftEntryAction(entryId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;

  const cur = await supabase.from("journal_entries").select("status").eq("org_id", orgId).eq("id", entryId).maybeSingle();
  if (!cur.data) return fail("Lançamento não encontrado.");
  if (cur.data.status !== "draft") return fail("Só um rascunho pode ser excluído. Um lançamento postado se estorna.");

  const { error } = await supabase.from("journal_entries").delete().eq("org_id", orgId).eq("id", entryId);
  if (error) return fail(friendlyAccountingError(error.message));
  revalidateAll();
  return ok(undefined);
}
