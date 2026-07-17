import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { canManageGiving } from "@/features/giving/access";
import { getReceipt } from "@/features/giving/queries";
import { ReceiptView } from "@/features/giving/components/ReceiptView";

// Recibo de doação (Server Component) — relido do SNAPSHOT imutável. Gated por
// finance.manage (RLS m30 é a barreira real).
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  const { id } = await params;

  if (!canManageGiving(ctx)) {
    return (
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="empty">Esta área é restrita ao tesoureiro e ao dono.</div>
      </div>
    );
  }

  const receipt = await getReceipt(ctx.supabase, ctx.orgId, id);
  if (!receipt) notFound();

  return <ReceiptView snapshot={receipt.snapshot} />;
}
