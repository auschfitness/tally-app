import { requireOrg } from "@/lib/auth/session";
import { listServices, serviceOccurrenceCounts } from "@/features/services/queries";
import { ServicesBoard } from "@/features/services/components/ServicesBoard";

// Cultos (Server Component): lista os cultos recorrentes da org. Mutações via
// Server Actions. Presença compartilha o caminho de Groups (context_type='service').
export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [services, occ, campusRes] = await Promise.all([
    listServices(supabase, orgId),
    serviceOccurrenceCounts(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";

  return (
    <ServicesBoard
      services={services}
      occByService={Object.fromEntries(occ)}
      campuses={campuses}
      activeCampus={activeCampus}
    />
  );
}
