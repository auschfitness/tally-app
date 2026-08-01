// Consultas da Contabilidade. O RLS (m48) já restringe a quem tem finance.manage —
// o filtro explícito por org_id é defesa em profundidade. Plano de contas, lançamentos
// (com totais das partidas), detalhe de um lançamento, fundos e balancete (RPC).
import type { DB } from "@/lib/auth/session";
import { sumSides } from "./domain";
import type { Account, EntryDetail, EntryLine, Fund, JournalEntry, TrialBalanceRow } from "./types";

export async function listAccounts(supabase: DB, orgId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from("ledger_accounts")
    .select("id, code, name, type, parent_id, is_active")
    .eq("org_id", orgId)
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []).map((a): Account => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    parentId: a.parent_id,
    isActive: a.is_active,
  }));
}

// Moeda da organização (dita a máscara e a formatação em toda a tela).
export async function loadCurrency(supabase: DB, orgId: string): Promise<string> {
  const { data } = await supabase.from("organizations").select("currency, country").eq("id", orgId).maybeSingle();
  return data?.currency ?? (data?.country === "US" ? "USD" : "BRL");
}

export async function listFunds(supabase: DB, orgId: string): Promise<Fund[]> {
  const { data } = await supabase.from("funds").select("id, name").eq("org_id", orgId).order("name");
  return (data ?? []).map((f) => ({ id: f.id, name: f.name }));
}

// Contas que já têm partidas (não podem ser apagadas). Devolve um Set de account_id.
export async function accountsWithLines(supabase: DB, orgId: string): Promise<Set<string>> {
  const { data } = await supabase.from("journal_lines").select("account_id").eq("org_id", orgId);
  return new Set((data ?? []).map((l) => l.account_id));
}

// Lançamentos por período (entry_date entre from..to, inclusivo), com o total de
// débitos/créditos calculado a partir das partidas (uma query, agregada no app).
export async function listEntries(
  supabase: DB,
  orgId: string,
  range: { from: string | null; to: string | null },
): Promise<JournalEntry[]> {
  let q = supabase
    .from("journal_entries")
    .select("id, entry_date, memo, reference, status, fund_id, reverses_entry_id, posted_at")
    .eq("org_id", orgId);
  if (range.from) q = q.gte("entry_date", range.from);
  if (range.to) q = q.lte("entry_date", range.to);

  const [entriesRes, linesRes, fundsRes] = await Promise.all([
    q.order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("journal_lines").select("entry_id, debit, credit").eq("org_id", orgId),
    supabase.from("funds").select("id, name").eq("org_id", orgId),
  ]);

  if (entriesRes.error) throw new Error(entriesRes.error.message);

  const linesByEntry = new Map<string, { debit: number; credit: number }[]>();
  for (const l of linesRes.data ?? []) {
    const arr = linesByEntry.get(l.entry_id) ?? [];
    arr.push({ debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 });
    linesByEntry.set(l.entry_id, arr);
  }
  const fundById = new Map<string, string>();
  for (const f of fundsRes.data ?? []) fundById.set(f.id, f.name);

  return (entriesRes.data ?? []).map((e): JournalEntry => {
    const lines = linesByEntry.get(e.id) ?? [];
    const totals = sumSides(lines);
    return {
      id: e.id,
      date: e.entry_date,
      memo: e.memo ?? "",
      reference: e.reference ?? "",
      status: e.status,
      fundId: e.fund_id,
      fundName: (e.fund_id && fundById.get(e.fund_id)) || "",
      reversesEntryId: e.reverses_entry_id,
      postedAt: e.posted_at,
      debitTotal: totals.debit,
      creditTotal: totals.credit,
      lineCount: lines.length,
    };
  });
}

// Um lançamento com suas partidas (conta resolvida por join com ledger_accounts).
export async function getEntry(supabase: DB, orgId: string, id: string): Promise<EntryDetail | null> {
  const { data: e } = await supabase
    .from("journal_entries")
    .select("id, entry_date, memo, reference, status, fund_id, reverses_entry_id, posted_at")
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!e) return null;

  const [linesRes, fundRes] = await Promise.all([
    supabase
      .from("journal_lines")
      .select("id, account_id, debit, credit, description, fund_id, line_no, ledger_accounts(code, name)")
      .eq("org_id", orgId)
      .eq("entry_id", id)
      .order("line_no"),
    e.fund_id ? supabase.from("funds").select("name").eq("id", e.fund_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const lines: EntryLine[] = (linesRes.data ?? []).map((l) => {
    const accRel = l.ledger_accounts as { code: string; name: string } | null;
    return {
      id: l.id,
      accountId: l.account_id,
      accountCode: accRel?.code ?? "",
      accountName: accRel?.name ?? "",
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description ?? "",
      fundId: l.fund_id,
    };
  });
  const totals = sumSides(lines);

  return {
    id: e.id,
    date: e.entry_date,
    memo: e.memo ?? "",
    reference: e.reference ?? "",
    status: e.status,
    fundId: e.fund_id,
    fundName: (fundRes.data as { name: string } | null)?.name ?? "",
    reversesEntryId: e.reverses_entry_id,
    postedAt: e.posted_at,
    debitTotal: totals.debit,
    creditTotal: totals.credit,
    lineCount: lines.length,
    lines,
  };
}

// Balancete via RPC trial_balance (débito/crédito/saldo por conta, até a data).
export async function getTrialBalance(supabase: DB, orgId: string, asOf: string | null): Promise<TrialBalanceRow[]> {
  const { data, error } = await supabase.rpc("trial_balance", { p_org: orgId, p_as_of: asOf ?? undefined });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r): TrialBalanceRow => ({
    accountId: r.account_id,
    code: r.code,
    name: r.name,
    type: r.type,
    debit: Number(r.debit) || 0,
    credit: Number(r.credit) || 0,
    balance: Number(r.balance) || 0,
  }));
}
