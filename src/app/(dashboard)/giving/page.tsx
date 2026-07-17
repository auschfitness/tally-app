import { requireOrg } from "@/lib/auth/session";
import { canManageGiving } from "@/features/giving/access";
import { listDonations, listDonors, listFunds, listReceipts, loadGivingFiscal } from "@/features/giving/queries";
import { GivingBoard } from "@/features/giving/components/GivingBoard";

// Giving/Doações (Server Component). Área SENSÍVEL: só quem tem finance.manage
// (Tesoureiro/Dono) entra — o RLS m30 é a barreira real; aqui a UI dá o recado claro
// a quem não pode. Ver docs/handoffs/giving-fase1.md.
export default async function GivingPage() {
  const ctx = await requireOrg();

  if (!canManageGiving(ctx)) {
    return (
      <>
        <h1 className="page">Doações</h1>
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Esta área é restrita ao tesoureiro e ao dono.
            <br />
            <span className="muted">Dado de doador é sensível — peça acesso a quem administra as finanças da igreja.</span>
          </div>
        </div>
      </>
    );
  }

  const { supabase, orgId } = ctx;
  const [donations, donors, funds, receipts, fiscal] = await Promise.all([
    listDonations(supabase, orgId),
    listDonors(supabase, orgId),
    listFunds(supabase, orgId),
    listReceipts(supabase, orgId),
    loadGivingFiscal(supabase, orgId),
  ]);

  return (
    <GivingBoard
      donations={donations}
      donors={donors}
      funds={funds}
      receipts={receipts}
      country={fiscal.country}
      currency={fiscal.currency}
    />
  );
}
