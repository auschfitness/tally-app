"use server";

// Importação de extrato (spec 11, fase B). O navegador lê o arquivo e manda só as linhas;
// aqui elas são revalidadas (não confiamos no cliente), deduplicadas por (conta, FITID) e
// gravadas como pendentes de classificação. Tudo exige finance.manage.
import { revalidatePath } from "next/cache";
import { requireOrg, can, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import type { StatementFormat, StatementTransaction } from "./statement";
import { friendlyFinanceError, type BankLine, type CategoryRule } from "./domain";
import { payeeKey, type HistoryLine } from "./suggest";

const DENIED = "Você não tem permissão para mexer nas finanças.";
const MAX_ROWS = 5000;
const CHUNK = 500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ImportPayload {
  accountId: string;
  filename: string;
  format: StatementFormat;
  acctId: string | null; // ACCTID do OFX: a próxima importação escolhe esta conta sozinha
  transactions: StatementTransaction[];
}

function cleanRows(rows: StatementTransaction[]): StatementTransaction[] | null {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return null;
  const out: StatementTransaction[] = [];
  for (const r of rows) {
    const amount = Math.round(Number(r.amount) * 100) / 100;
    if (typeof r.fitid !== "string" || !r.fitid || r.fitid.length > 200) return null;
    if (typeof r.date !== "string" || !ISO_DATE.test(r.date)) return null;
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) >= 1e12) return null;
    out.push({ fitid: r.fitid, date: r.date, amount, description: String(r.description ?? "").slice(0, 500) });
  }
  return out;
}

async function assertBankAccount(supabase: DB, orgId: string, accountId: string): Promise<boolean> {
  const { data } = await supabase.from("ledger_accounts").select("id").eq("org_id", orgId).eq("id", accountId).eq("type", "asset").eq("is_active", true).maybeSingle();
  return Boolean(data);
}

async function existingFitids(supabase: DB, accountId: string, fitids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < fitids.length; i += CHUNK) {
    const { data } = await supabase.from("bank_transactions").select("fitid").eq("account_id", accountId).in("fitid", fitids.slice(i, i + CHUNK));
    for (const r of data ?? []) found.add(r.fitid);
  }
  return found;
}

// Prévia: quais FITIDs já estão nesta conta (para mostrar "novas / já importadas").
export async function previewImportAction(accountId: string, fitids: string[]): Promise<ActionResult<{ existing: string[] }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  if (!Array.isArray(fitids) || fitids.length > MAX_ROWS) return fail("Arquivo grande demais.");
  if (!(await assertBankAccount(ctx.supabase, ctx.orgId, accountId))) return fail("Escolha uma conta válida.");
  return ok({ existing: [...(await existingFitids(ctx.supabase, accountId, fitids))] });
}

export async function importStatementAction(payload: ImportPayload): Promise<ActionResult<{ imported: number; duplicates: number }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId, user } = ctx;
  const rows = cleanRows(payload.transactions);
  if (!rows) return fail(`O arquivo tem linhas inválidas ou passa de ${MAX_ROWS} lançamentos.`);
  if (!["ofx", "ofc", "csv"].includes(payload.format)) return fail("Formato não suportado.");
  if (!(await assertBankAccount(supabase, orgId, payload.accountId))) return fail("Escolha uma conta válida.");

  try {
    const dates = rows.map((r) => r.date).sort();
    const { data: imp, error: impError } = await supabase
      .from("bank_imports")
      .insert({
        org_id: orgId,
        account_id: payload.accountId,
        filename: String(payload.filename).slice(0, 200),
        format: payload.format,
        period_start: dates[0] ?? null,
        period_end: dates[dates.length - 1] ?? null,
        total_rows: rows.length,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (impError || !imp) return fail(toMessage(impError, "Não consegui registrar a importação."));

    let imported = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { data, error } = await supabase
        .from("bank_transactions")
        .upsert(
          rows.slice(i, i + CHUNK).map((r) => ({
            org_id: orgId,
            account_id: payload.accountId,
            import_id: imp.id,
            fitid: r.fitid,
            posted_at: r.date,
            amount: r.amount,
            description: r.description,
          })),
          { onConflict: "account_id,fitid", ignoreDuplicates: true },
        )
        .select("id");
      if (error) return fail(toMessage(error, "Não consegui gravar as linhas do extrato."));
      imported += data?.length ?? 0;
    }
    await supabase.from("bank_imports").update({ new_rows: imported }).eq("id", imp.id);

    const acctId = payload.acctId?.trim().slice(0, 60) || null;
    if (acctId) {
      await supabase.from("ledger_accounts").update({ statement_acct_id: null }).eq("org_id", orgId).eq("statement_acct_id", acctId);
      await supabase.from("ledger_accounts").update({ statement_acct_id: acctId }).eq("org_id", orgId).eq("id", payload.accountId);
    }

    revalidatePath("/finance");
    return ok({ imported, duplicates: rows.length - imported });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// --- Classificar (spec 11, fase C) ---------------------------------------------------

export interface PendingData {
  lines: BankLine[];
  rules: CategoryRule[];
  history: HistoryLine[]; // linhas já classificadas: ensinam a sugestão sem a pessoa pedir
  linkedEntryIds: string[]; // lançamentos já ligados a alguma linha do banco
}

const HISTORY_LIMIT = 2000;

export async function listPendingAction(): Promise<ActionResult<PendingData>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const [pendingRes, rulesRes, linkedRes] = await Promise.all([
    supabase.from("bank_transactions").select("id, account_id, posted_at, amount, description").eq("org_id", orgId).eq("status", "pending").order("posted_at").limit(MAX_ROWS),
    supabase.from("category_rules").select("id, pattern, account_id").eq("org_id", orgId),
    supabase
      .from("bank_transactions")
      .select("account_id, journal_entry_id, posted_at, amount, description")
      .eq("org_id", orgId)
      .not("journal_entry_id", "is", null)
      .order("posted_at", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);
  if (pendingRes.error) return fail(toMessage(pendingRes.error));

  // Categoria de cada linha classificada = a outra partida do lançamento (não a conta do banco).
  const classified = linkedRes.data ?? [];
  const entryIds = classified.flatMap((r) => (r.journal_entry_id ? [r.journal_entry_id] : []));
  const counterByEntry = new Map<string, string>();
  const accountByEntry = new Map(classified.map((r) => [r.journal_entry_id, r.account_id]));
  for (let i = 0; i < entryIds.length; i += CHUNK) {
    const { data } = await supabase.from("journal_lines").select("entry_id, account_id").eq("org_id", orgId).in("entry_id", entryIds.slice(i, i + CHUNK));
    for (const l of data ?? []) if (l.account_id !== accountByEntry.get(l.entry_id)) counterByEntry.set(l.entry_id, l.account_id);
  }
  const history: HistoryLine[] = classified.flatMap((r) => {
    const counterId = r.journal_entry_id ? counterByEntry.get(r.journal_entry_id) : undefined;
    return counterId ? [{ description: r.description, amount: Number(r.amount), date: r.posted_at, counterId }] : [];
  });

  return ok({
    lines: (pendingRes.data ?? []).map((r) => ({ id: r.id, accountId: r.account_id, date: r.posted_at, amount: Number(r.amount), description: r.description })),
    rules: (rulesRes.data ?? []).map((r) => ({ id: r.id, pattern: r.pattern, accountId: r.account_id })),
    history,
    linkedEntryIds: entryIds,
  });
}

// Classifica em lote: cada linha vira um lançamento no livro (record_transaction) e fica
// ligada a ele. Uma falha não derruba as outras; o resultado conta as duas.
export async function classifyLinesAction(items: { id: string; counterId: string }[]): Promise<ActionResult<{ done: number; failed: number; lastError: string }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ROWS) return fail("Nada para classificar.");

  const ids = items.map((i) => i.id);
  const lines = new Map<string, { account_id: string; posted_at: string; amount: number; description: string }>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await supabase.from("bank_transactions").select("id, account_id, posted_at, amount, description").eq("org_id", orgId).eq("status", "pending").in("id", ids.slice(i, i + CHUNK));
    for (const r of data ?? []) lines.set(r.id, r);
  }

  let done = 0;
  let failed = 0;
  let lastError = "";
  for (const item of items) {
    const line = lines.get(item.id);
    if (!line) {
      failed++;
      continue;
    }
    const amount = Number(line.amount);
    const { data: entryId, error } = await supabase.rpc("record_transaction", {
      p_org: orgId,
      p_kind: amount > 0 ? "in" : "out",
      p_amount: Math.abs(amount),
      p_date: line.posted_at,
      p_account: line.account_id,
      p_counter: item.counterId,
      p_memo: line.description,
    });
    if (error || !entryId) {
      failed++;
      lastError = friendlyFinanceError(toMessage(error, "Não consegui classificar."));
      continue;
    }
    await supabase.from("bank_transactions").update({ status: "classified", journal_entry_id: entryId }).eq("id", item.id);
    done++;
  }
  revalidatePath("/finance");
  return ok({ done, failed, lastError });
}

// Vincula a um lançamento já feito à mão: nada novo entra no livro.
export async function linkLineAction(lineId: string, entryId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const { data: entry } = await supabase.from("journal_entries").select("id").eq("org_id", orgId).eq("id", entryId).eq("status", "posted").maybeSingle();
  if (!entry) return fail("Esse lançamento não existe mais.");
  const { error } = await supabase.from("bank_transactions").update({ status: "classified", journal_entry_id: entryId }).eq("org_id", orgId).eq("id", lineId).eq("status", "pending");
  if (error) return fail(toMessage(error));
  revalidatePath("/finance");
  return ok(undefined);
}

export async function ignoreLinesAction(ids: string[]): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ROWS) return fail("Nada para ignorar.");
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await ctx.supabase.from("bank_transactions").update({ status: "ignored" }).eq("org_id", ctx.orgId).eq("status", "pending").in("id", ids.slice(i, i + CHUNK));
    if (error) return fail(toMessage(error));
  }
  revalidatePath("/finance");
  return ok(undefined);
}

// "Sempre": lembra que este favorecido é desta categoria. Devolve a regra para a tela poder
// mostrar "✓ Sempre" e desfazer no mesmo botão.
export async function rememberRuleAction(description: string, counterId: string): Promise<ActionResult<CategoryRule>> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const pattern = payeeKey(String(description)).slice(0, 80);
  if (pattern.length < 3) return fail("Esse texto é curto demais para lembrar.");
  const { data: account } = await ctx.supabase.from("ledger_accounts").select("id").eq("org_id", ctx.orgId).eq("id", counterId).in("type", ["revenue", "expense"]).maybeSingle();
  if (!account) return fail("Escolha uma categoria válida.");
  const { data, error } = await ctx.supabase
    .from("category_rules")
    .upsert({ org_id: ctx.orgId, pattern, account_id: counterId }, { onConflict: "org_id,pattern" })
    .select("id, pattern, account_id")
    .single();
  if (error || !data) return fail(toMessage(error, "Não consegui lembrar."));
  return ok({ id: data.id, pattern: data.pattern, accountId: data.account_id });
}

export async function forgetRuleAction(ruleId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { error } = await ctx.supabase.from("category_rules").delete().eq("org_id", ctx.orgId).eq("id", ruleId);
  if (error) return fail(toMessage(error, "Não consegui esquecer a regra."));
  return ok(undefined);
}

// "É a conta de luz de 15/10?" (spec 12, fase D): paga a conta aberta com a data e o valor
// do extrato (pay_bill) e liga a linha ao lançamento que nasceu. Nada é lançado duas vezes.
export async function payBillFromLineAction(lineId: string, billId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const [{ data: line }, { data: bill }] = await Promise.all([
    supabase.from("bank_transactions").select("id, account_id, posted_at, amount").eq("org_id", orgId).eq("id", lineId).eq("status", "pending").maybeSingle(),
    supabase.from("finance_bills").select("id, kind, status").eq("org_id", orgId).eq("id", billId).maybeSingle(),
  ]);
  if (!line) return fail("Essa linha já foi classificada.");
  if (!bill || bill.status !== "open") return fail("Essa conta já foi paga.");
  const amount = Number(line.amount);
  if ((amount > 0 ? "in" : "out") !== bill.kind) return fail("A direção do extrato não bate com a conta.");
  const { data: entryId, error } = await supabase.rpc("pay_bill", { p_bill: billId, p_date: line.posted_at, p_account: line.account_id, p_amount: Math.abs(amount) });
  if (error || !entryId) return fail(friendlyFinanceError(toMessage(error, "Não consegui registrar o pagamento.")));
  await supabase.from("bank_transactions").update({ status: "classified", journal_entry_id: entryId }).eq("id", lineId);
  revalidatePath("/finance");
  return ok(undefined);
}
