import { requireOrg, can } from "@/lib/auth/session";
import { loadLedger } from "@/features/finance/queries";
import { FinanceBoard } from "@/features/finance/components/FinanceBoard";

// Finanças (spec 10): o livro de partidas dobradas lido em linguagem de tesoureiro.
// Área sensível: só finance.manage (o RLS m48 é a barreira real).
export default async function FinancePage() {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) {
    return (
      <>
        <h1 className="page">Finanças</h1>
        <div className="empty" style={{ lineHeight: 1.6, marginTop: 24 }}>
          Esta área é do tesoureiro e do dono da conta.
          <br />
          <span className="muted">Peça acesso a quem cuida das finanças da igreja.</span>
        </div>
      </>
    );
  }
  const ledger = await loadLedger(ctx.supabase, ctx.orgId);
  return <FinanceBoard ledger={ledger} />;
}
