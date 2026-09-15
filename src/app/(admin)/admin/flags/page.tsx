import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin, loadAdminFlags, loadAdminOrgs } from "@/features/admin/queries";
import { FlagsPanel } from "@/features/admin/components/FlagsPanel";

export const metadata: Metadata = { title: "Flags · Tally" };

// Aba de feature flags do painel da plataforma. Re-checa o gate (defesa em profundidade,
// além do layout). A escrita continua gated por is_platform_admin() dentro das RPCs.
export default async function AdminFlagsPage() {
  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) notFound();

  const [flags, orgs] = await Promise.all([loadAdminFlags(supabase), loadAdminOrgs(supabase)]);

  return <FlagsPanel flags={flags} orgs={orgs} />;
}
