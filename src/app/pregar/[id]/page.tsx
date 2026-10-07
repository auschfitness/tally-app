import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSermons } from "@/features/study/queries";
import { PulpitView } from "@/features/study/components/PulpitView";

// Modo púlpito (fora da casca do app: sem menu lateral, tela cheia). Mesmo gate do
// editor: sessão + org no servidor; a RLS limita o sermão à org.
export const metadata: Metadata = { title: "Pregar" };

export default async function PulpitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, orgId } = await requireOrg();
  const sermon = (await listSermons(supabase, orgId)).find((s) => s.id === id);
  if (!sermon) notFound();
  return <PulpitView sermon={sermon} autoPrint={sp.imprimir === "1"} />;
}
