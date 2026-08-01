import { requireOrg } from "@/lib/auth/session";
import { canManageAccounting } from "@/features/accounting/access";
import { accountsWithLines, listAccounts } from "@/features/accounting/queries";
import { AccountingNav } from "@/features/accounting/components/AccountingNav";
import { AccountsBoard } from "@/features/accounting/components/AccountsBoard";
import { Denied } from "@/features/accounting/components/Denied";

// Plano de contas (Server Component). Gated por finance.manage.
export default async function AccountingAccountsPage() {
  const ctx = await requireOrg();
  if (!canManageAccounting(ctx)) return <Denied />;

  const { supabase, orgId } = ctx;
  const [accounts, used] = await Promise.all([listAccounts(supabase, orgId), accountsWithLines(supabase, orgId)]);

  return (
    <>
      <h1 className="page">Contabilidade</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Partidas dobradas — o razão completo da igreja.</p>
      <AccountingNav />
      <AccountsBoard accounts={accounts} usedIds={[...used]} />
    </>
  );
}
