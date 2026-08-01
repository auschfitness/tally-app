import { requireOrg } from "@/lib/auth/session";
import { canManageAccounting } from "@/features/accounting/access";
import { getTrialBalance, loadCurrency } from "@/features/accounting/queries";
import { AccountingNav } from "@/features/accounting/components/AccountingNav";
import { ReportsBoard } from "@/features/accounting/components/ReportsBoard";
import { Denied } from "@/features/accounting/components/Denied";

// Relatórios (Server Component): Balancete (RPC trial_balance) + DRE derivada. A data de
// corte vem por ?asOf= (o RPC recalcula no servidor). Gated por finance.manage.
export default async function AccountingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const ctx = await requireOrg();
  if (!canManageAccounting(ctx)) return <Denied />;

  const sp = await searchParams;
  const asOf = sp.asOf && /^\d{4}-\d{2}-\d{2}$/.test(sp.asOf) ? sp.asOf : null;

  const { supabase, orgId } = ctx;
  const [rows, currency] = await Promise.all([getTrialBalance(supabase, orgId, asOf), loadCurrency(supabase, orgId)]);

  return (
    <>
      <h1 className="page">Contabilidade</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Partidas dobradas — o razão completo da igreja.</p>
      <AccountingNav />
      <ReportsBoard rows={rows} asOf={asOf} currency={currency} />
    </>
  );
}
