import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin, loadAdminOrgs, loadPlatformStats } from "@/features/admin/queries";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";

export const metadata: Metadata = { title: "Admin · Tally" };

// Painel super-admin da plataforma. Re-checa o gate (defesa em profundidade, além do
// layout) e lê SÓ agregados pelas RPCs gated — nunca tabelas sensíveis cross-org.
export default async function AdminPage() {
  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) notFound();

  const [stats, orgs] = await Promise.all([loadPlatformStats(supabase), loadAdminOrgs(supabase)]);

  return <AdminDashboard stats={stats} orgs={orgs} />;
}
