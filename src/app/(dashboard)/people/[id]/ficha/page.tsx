import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { getPerson, loadChurch } from "@/features/sticks/queries";
import { FichaView } from "@/features/sticks/components/PrintViews";

export const metadata: Metadata = { title: "Ficha cadastral" };

// Ficha cadastral para imprimir (A4). Sessão e org no servidor; o RLS limita a ficha à equipe.
export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const [detail, church] = await Promise.all([getPerson(ctx.supabase, ctx.orgId, id, false), loadChurch(ctx.supabase, ctx.orgId)]);
  if (!detail) notFound();
  return <FichaView detail={detail} church={church} />;
}
