import { requireOrg } from "@/lib/auth/session";
import { canManageAccounting } from "@/features/accounting/access";
import { getTrialBalance, listAccounts, listEntries, loadCurrency } from "@/features/accounting/queries";
import { buildIncomeStatement } from "@/features/accounting/domain";
import { AccountingNav } from "@/features/accounting/components/AccountingNav";
import { AccountingOverview } from "@/features/accounting/components/AccountingOverview";
import { Denied } from "@/features/accounting/components/Denied";

// Contabilidade — Visão geral (Server Component). Área sensível: só finance.manage
// (RLS m48 é a barreira). Retrato da posição + atalhos. Ver docs/handoffs/financeiro-contabilidade.md.
export default async function AccountingPage() {
  const ctx = await requireOrg();
  if (!canManageAccounting(ctx)) return <Denied />;

  const { supabase, orgId } = ctx;
  const [rows, accounts, entries, currency] = await Promise.all([
    getTrialBalance(supabase, orgId, null),
    listAccounts(supabase, orgId),
    listEntries(supabase, orgId, { from: null, to: null }),
    loadCurrency(supabase, orgId),
  ]);

  const dre = buildIncomeStatement(rows);
  const draftCount = entries.filter((e) => e.status === "draft").length;
  const postedCount = entries.filter((e) => e.status === "posted").length;

  return (
    <>
      <h1 className="page">Contabilidade</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Partidas dobradas — o razão completo da igreja.</p>
      <AccountingNav />
      <AccountingOverview
        dre={dre}
        currency={currency}
        accountsCount={accounts.length}
        draftCount={draftCount}
        postedCount={postedCount}
        recent={entries.slice(0, 8)}
      />
    </>
  );
}
