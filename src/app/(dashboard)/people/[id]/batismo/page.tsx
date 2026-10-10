import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { getPerson, loadChurch } from "@/features/sticks/queries";
import { BaptismView } from "@/features/sticks/components/PrintViews";

export const metadata: Metadata = { title: "Certificado de batismo" };

// Certificado de batismo (A4 paisagem). Só existe para quem tem data de batismo.
export default async function BaptismPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const [detail, church] = await Promise.all([getPerson(ctx.supabase, ctx.orgId, id, false), loadChurch(ctx.supabase, ctx.orgId)]);
  if (!detail) notFound();
  return <BaptismView detail={detail} church={church} />;
}
