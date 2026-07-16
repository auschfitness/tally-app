// Consultas de Finance. Lançamentos + listas de fundos/categorias (das tabelas
// relacionais funds/finance_categories, não do blob). RLS filtra por org.
import type { DB } from "@/lib/auth/session";
import { type FinanceEntry, type EntryType } from "./domain";

function asType(v: string): EntryType {
  return v === "out" ? "out" : "in";
}

export async function listEntries(supabase: DB, orgId: string): Promise<FinanceEntry[]> {
  const [entriesRes, campusRes] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("id, type, description, category_name, fund_name, amount, entry_date, campus_id")
      .eq("org_id", orgId)
      .order("entry_date", { ascending: false }),
    supabase.from("campuses").select("id, name").eq("org_id", orgId),
  ]);

  if (entriesRes.error) throw new Error(entriesRes.error.message);

  const campusById = new Map<string, string>();
  for (const c of campusRes.data ?? []) campusById.set(c.id, c.name);

  return (entriesRes.data ?? []).map((row): FinanceEntry => ({
    id: row.id,
    type: asType(row.type),
    desc: row.description ?? "",
    cat: row.category_name ?? "",
    fund: row.fund_name ?? "",
    amount: Number(row.amount) || 0,
    date: row.entry_date ?? "",
    campus: (row.campus_id && campusById.get(row.campus_id)) || "",
  }));
}

export async function listFunds(supabase: DB, orgId: string): Promise<string[]> {
  const { data } = await supabase.from("funds").select("name").eq("org_id", orgId).order("name");
  return (data ?? []).map((f) => f.name);
}

// Categorias por tipo (in/out), das finance_categories da org.
export async function listCategories(supabase: DB, orgId: string): Promise<{ in: string[]; out: string[] }> {
  const { data } = await supabase.from("finance_categories").select("name, type").eq("org_id", orgId).order("name");
  const result = { in: [] as string[], out: [] as string[] };
  for (const c of data ?? []) {
    if (c.type === "out") result.out.push(c.name);
    else result.in.push(c.name);
  }
  return result;
}
