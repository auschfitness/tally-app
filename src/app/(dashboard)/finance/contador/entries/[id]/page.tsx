import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { isoDate, today } from "@/lib/utils/date";
import { canManageAccounting } from "@/features/accounting/access";
import { getEntry, listAccounts, listFunds, loadCurrency } from "@/features/accounting/queries";
import { AccountingNav } from "@/features/accounting/components/AccountingNav";
import { EntryEditor } from "@/features/accounting/components/EntryEditor";
import { EntryView } from "@/features/accounting/components/EntryView";
import { Denied } from "@/features/accounting/components/Denied";

// Um lançamento (Server Component). Rascunho → editor (editável); postado/anulado →
// visão só-leitura com estorno. Gated por finance.manage.
export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  if (!canManageAccounting(ctx)) return <Denied />;
  const { id } = await params;
  const { supabase, orgId } = ctx;

  const entry = await getEntry(supabase, orgId, id);
  if (!entry) notFound();

  const isDraft = entry.status === "draft";
  const [accounts, funds, currency] = await Promise.all([
    isDraft ? listAccounts(supabase, orgId) : Promise.resolve([]),
    isDraft ? listFunds(supabase, orgId) : Promise.resolve([]),
    loadCurrency(supabase, orgId),
  ]);

  return (
    <>
      <h1 className="page">{isDraft ? "Editar lançamento" : "Lançamento"}</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        {isDraft ? "Rascunho — ajuste as partidas e poste quando fechar." : "Partidas dobradas — o razão completo da igreja."}
      </p>
      <AccountingNav />
      {isDraft ? (
        <EntryEditor accounts={accounts} funds={funds} currency={currency} entry={entry} today={isoDate(today())} />
      ) : (
        <EntryView entry={entry} currency={currency} />
      )}
    </>
  );
}
