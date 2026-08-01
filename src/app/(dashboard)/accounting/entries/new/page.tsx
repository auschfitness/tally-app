import { requireOrg } from "@/lib/auth/session";
import { isoDate, today } from "@/lib/utils/date";
import { canManageAccounting } from "@/features/accounting/access";
import { listAccounts, listFunds, loadCurrency } from "@/features/accounting/queries";
import { AccountingNav } from "@/features/accounting/components/AccountingNav";
import { EntryEditor } from "@/features/accounting/components/EntryEditor";
import { Denied } from "@/features/accounting/components/Denied";

// Novo lançamento (Server Component). Carrega contas e fundos para o editor; a data de
// hoje é calculada no servidor (evita mismatch de hidratação). Gated por finance.manage.
export default async function NewEntryPage() {
  const ctx = await requireOrg();
  if (!canManageAccounting(ctx)) return <Denied />;

  const { supabase, orgId } = ctx;
  const [accounts, funds, currency] = await Promise.all([
    listAccounts(supabase, orgId),
    listFunds(supabase, orgId),
    loadCurrency(supabase, orgId),
  ]);

  return (
    <>
      <h1 className="page">Novo lançamento</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Débitos e créditos que se equilibram. Postar torna o lançamento imutável.</p>
      <AccountingNav />
      <EntryEditor accounts={accounts} funds={funds} currency={currency} entry={null} today={isoDate(today())} />
    </>
  );
}
