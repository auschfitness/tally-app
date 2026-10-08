// Consultas de Finanças sobre o livro (m48). O RLS restringe a finance.manage; o filtro
// por org_id é defesa em profundidade. Carrega o livro inteiro da org e o cliente filtra
// por período.
// ponytail: livro inteiro numa ida; paginar por período quando uma igreja passar de alguns
// milhares de lançamentos.
import type { DB } from "@/lib/auth/session";
import { toMovement, type LedgerAccount, type LedgerEntry, type LedgerLine, type Movement } from "./domain";

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
