import { requireOrg } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { listEntries, listFunds, listCategories } from "@/features/finance/queries";
import { FinanceBoard } from "@/features/finance/components/FinanceBoard";

// Finance Lite (Server Component): busca no servidor (RLS por org), filtra o
// campus ativo, entrega ao board. Mutações via Server Actions.
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [entries, funds, categories, campusRes, orgRes] = await Promise.all([
    listEntries(supabase, orgId),
    listFunds(supabase, orgId),
    listCategories(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
    supabase.from("organizations").select("currency").eq("id", orgId).maybeSingle(),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);
  const currency = orgRes.data?.currency ?? "BRL";
  const campusEntries = entries.filter((e) => e.campus === activeCampus);

  // Fundos do dropdown: tabela funds ∪ fundos já usados em lançamentos.
  const fundSet = new Set<string>(funds);
  for (const e of entries) if (e.fund) fundSet.add(e.fund);

  return (
    <FinanceBoard
      entries={campusEntries}
      currency={currency}
      activeCampus={activeCampus}
      catIn={categories.in}
      catOut={categories.out}
      funds={[...fundSet]}
    />
  );
}
