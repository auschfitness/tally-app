// Consultas de Finanças sobre o livro (m48). O RLS restringe a finance.manage; o filtro
// por org_id é defesa em profundidade. Carrega o livro inteiro da org e o cliente filtra
// por período.
// ponytail: livro inteiro numa ida; paginar por período quando uma igreja passar de alguns
// milhares de lançamentos.
import type { DB } from "@/lib/auth/session";
import { toMovement, type LedgerAccount, type LedgerEntry, type LedgerLine, type Movement } from "./domain";
import { addMonths, HORIZON_MONTHS, needsExtension, pendingOccurrences, type Bill, type BillFrequency, type BillKind, type BillSeries } from "./bills";

export interface FinanceLedger {
  accounts: LedgerAccount[];
  entries: LedgerEntry[];
  lines: LedgerLine[];
  movements: Movement[];
  funds: { id: string; name: string }[];
  people: { id: string; name: string }[];
  currency: string;
  orgName: string;
  pendingCount: number; // linhas de extrato esperando classificação
}

export const ACCOUNT_COLUMNS = "id, code, name, type, parent_id, is_active, bank_code, is_default, statement_acct_id";

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: LedgerAccount["type"];
  parent_id: string | null;
  is_active: boolean;
  bank_code: string | null;
  is_default: boolean;
  statement_acct_id: string | null;
}

export function toLedgerAccount(a: AccountRow): LedgerAccount {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    parentId: a.parent_id,
    isActive: a.is_active,
    bankCode: a.bank_code,
    isDefault: a.is_default,
    statementAcctId: a.statement_acct_id,
  };
}

export async function loadLedger(supabase: DB, orgId: string): Promise<FinanceLedger> {
  const [accRes, entRes, lineRes, donRes, fundRes, stickRes, orgRes, pendingRes] = await Promise.all([
    supabase.from("ledger_accounts").select(ACCOUNT_COLUMNS).eq("org_id", orgId).order("code"),
    supabase
      .from("journal_entries")
      .select("id, entry_date, memo, reference, status, fund_id")
      .eq("org_id", orgId)
      .neq("status", "draft")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("journal_lines").select("entry_id, account_id, debit, credit").eq("org_id", orgId),
    supabase.from("donations").select("journal_entry_id, donor_name").eq("org_id", orgId).not("journal_entry_id", "is", null),
    supabase.from("funds").select("id, name").eq("org_id", orgId).order("name"),
    supabase.from("sticks").select("id, full_name").eq("org_id", orgId).order("full_name"),
    supabase.from("organizations").select("name, currency, country").eq("id", orgId).maybeSingle(),
    supabase.from("bank_transactions").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
  ]);
  if (accRes.error) throw new Error(accRes.error.message);
  if (entRes.error) throw new Error(entRes.error.message);
  if (lineRes.error) throw new Error(lineRes.error.message);

  const accounts: LedgerAccount[] = (accRes.data ?? []).map(toLedgerAccount);
  const entries: LedgerEntry[] = (entRes.data ?? []).map((e) => ({
    id: e.id,
    date: e.entry_date,
    memo: e.memo ?? "",
    reference: e.reference ?? "",
    status: e.status,
    fundId: e.fund_id,
  }));
  const lines: LedgerLine[] = (lineRes.data ?? []).map((l) => ({
    entryId: l.entry_id,
    accountId: l.account_id,
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
  }));

  const linesByEntry = new Map<string, LedgerLine[]>();
  for (const l of lines) linesByEntry.set(l.entryId, [...(linesByEntry.get(l.entryId) ?? []), l]);
  const donorByEntry = new Map<string, string>();
  for (const d of donRes.data ?? []) if (d.journal_entry_id) donorByEntry.set(d.journal_entry_id, d.donor_name ?? "");
  const typeOf = new Map(accounts.map((a) => [a.id, a.type]));

  return {
    accounts,
    entries,
    lines,
    movements: entries.map((e) => toMovement(e, linesByEntry.get(e.id) ?? [], typeOf, donorByEntry.get(e.id) ?? "")),
    funds: (fundRes.data ?? []).map((f) => ({ id: f.id, name: f.name })),
    people: (stickRes.data ?? []).map((s) => ({ id: s.id, name: s.full_name })),
    currency: orgRes.data?.currency ?? (orgRes.data?.country === "US" ? "USD" : "BRL"),
    orgName: orgRes.data?.name ?? "",
    pendingCount: pendingRes.count ?? 0,
  };
}

// ── Contas a pagar e a receber (spec 12) ─────────────────────────────────────────────
export const BILL_COLUMNS =
  "id, series_id, seq, kind, description, amount, due_date, category_id, account_id, payee, notes, status, paid_on, paid_amount, journal_entry_id";
export const SERIES_COLUMNS = "id, frequency, anchor_date, ends_on, next_seq";

interface BillRow {
  id: string;
  series_id: string | null;
  seq: number | null;
  kind: string;
  description: string;
  amount: number;
  due_date: string;
  category_id: string;
  account_id: string | null;
  payee: string | null;
  notes: string | null;
  status: string;
  paid_on: string | null;
  paid_amount: number | null;
  journal_entry_id: string | null;
}

export function toBill(r: BillRow): Bill {
  return {
    id: r.id,
    seriesId: r.series_id,
    seq: r.seq,
    kind: r.kind === "in" ? "in" : "out",
    description: r.description,
    amount: Number(r.amount),
    dueDate: r.due_date,
    categoryId: r.category_id,
    accountId: r.account_id,
    payee: r.payee ?? "",
    notes: r.notes ?? "",
    status: r.status === "paid" ? "paid" : "open",
    paidOn: r.paid_on,
    paidAmount: r.paid_amount == null ? null : Number(r.paid_amount),
    journalEntryId: r.journal_entry_id,
  };
}

export function toSeries(r: { id: string; frequency: string; anchor_date: string; ends_on: string | null; next_seq: number }): BillSeries {
  const frequency: BillFrequency = r.frequency === "weekly" || r.frequency === "yearly" ? r.frequency : "monthly";
  return { id: r.id, frequency, anchorDate: r.anchor_date, endsOn: r.ends_on, nextSeq: r.next_seq };
}

export interface BillTemplate {
  kind: BillKind;
  description: string;
  amount: number;
  category_id: string;
  account_id: string | null;
  payee: string | null;
  notes: string | null;
}

// Gera as ocorrências que faltam até o horizonte, copiando os dados da última conta da série
// (assim "esta e as próximas" vale também para as que ainda vão nascer). Idempotente.
export async function extendSeries(supabase: DB, orgId: string, series: BillSeries, template: BillTemplate, todayIso: string): Promise<void> {
  const next = pendingOccurrences(series, addMonths(todayIso, HORIZON_MONTHS));
  const last = next[next.length - 1];
  if (!last) return;
  const { error } = await supabase
    .from("finance_bills")
    .upsert(
      next.map((o) => ({ ...template, org_id: orgId, series_id: series.id, seq: o.seq, due_date: o.dueDate })),
      { onConflict: "series_id,seq", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  await supabase.from("finance_bill_series").update({ next_seq: last.seq + 1 }).eq("id", series.id);
}

// ponytail: carrega todas as contas da org; paginar quando as pagas passarem de alguns milhares.
export async function loadBills(supabase: DB, orgId: string, todayIso: string): Promise<{ bills: Bill[]; series: BillSeries[] }> {
  const read = () =>
    Promise.all([
      supabase.from("finance_bills").select(BILL_COLUMNS).eq("org_id", orgId).order("due_date"),
      supabase.from("finance_bill_series").select(SERIES_COLUMNS).eq("org_id", orgId),
    ]);
  let [billRes, seriesRes] = await read();
  if (billRes.error) throw new Error(billRes.error.message);
  let series = (seriesRes.data ?? []).map(toSeries);
  let bills = (billRes.data ?? []).map(toBill);

  const stale = series.filter((s) => needsExtension(s, todayIso));
  if (stale.length > 0) {
    for (const s of stale) {
      const lastBill = bills.filter((b) => b.seriesId === s.id).sort((a, b) => (b.seq ?? 0) - (a.seq ?? 0))[0];
      if (!lastBill) continue; // série sem nenhuma conta: foi toda excluída
      await extendSeries(supabase, orgId, s, {
        kind: lastBill.kind,
        description: lastBill.description,
        amount: lastBill.amount,
        category_id: lastBill.categoryId,
        account_id: lastBill.accountId,
        payee: lastBill.payee || null,
        notes: lastBill.notes || null,
      }, todayIso);
    }
    [billRes, seriesRes] = await read();
    series = (seriesRes.data ?? []).map(toSeries);
    bills = (billRes.data ?? []).map(toBill);
  }
  return { bills, series };
}
