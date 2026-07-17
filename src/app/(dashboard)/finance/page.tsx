import { requireOrg } from "@/lib/auth/session";
import { listEntries, listFunds, listCategories } from "@/features/finance/queries";
import { FinanceBoard } from "@/features/finance/components/FinanceBoard";

// Finance Lite (Server Component): busca no servidor (RLS por org) e entrega ao board.
// Uma igreja = um local: o financeiro é da ORGANIZAÇÃO (sem filtro por campus).
// Mutações via Server Actions.
export default async function FinancePage() {
  const { supabase, orgId } = await requireOrg();

  const [entries, funds, categories, orgRes] = await Promise.all([
    listEntries(supabase, orgId),
    listFunds(supabase, orgId),
    listCategories(supabase, orgId),
    supabase.from("organizations").select("currency").eq("id", orgId).maybeSingle(),
  ]);

  const currency = orgRes.data?.currency ?? "BRL";

  // Fundos do dropdown: tabela funds ∪ fundos já usados em lançamentos.
  const fundSet = new Set<string>(funds);
  for (const e of entries) if (e.fund) fundSet.add(e.fund);

  return (
    <FinanceBoard
      entries={entries}
      currency={currency}
      catIn={categories.in}
      catOut={categories.out}
      funds={[...fundSet]}
    />
  );
}
