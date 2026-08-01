import { requireOrg } from "@/lib/auth/session";
import { canManageAccounting } from "@/features/accounting/access";
import { listEntries, loadCurrency } from "@/features/accounting/queries";
import { AccountingNav } from "@/features/accounting/components/AccountingNav";
import { EntriesBoard } from "@/features/accounting/components/EntriesBoard";
import { Denied } from "@/features/accounting/components/Denied";

// Lançamentos (Server Component). Carrega todos os lançamentos; o filtro de período é
// no cliente (reusa PeriodFilter). Gated por finance.manage.
export default async function AccountingEntriesPage() {
  const ctx = await requireOrg();
  if (!canManageAccounting(ctx)) return <Denied />;

  const { supabase, orgId } = ctx;
  const [entries, currency] = await Promise.all([
    listEntries(supabase, orgId, { from: null, to: null }),
    loadCurrency(supabase, orgId),
  ]);

  return (
    <>
      <h1 className="page">Contabilidade</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Partidas dobradas — o razão completo da igreja.</p>
      <AccountingNav />
      <EntriesBoard entries={entries} currency={currency} />
    </>
  );
}
