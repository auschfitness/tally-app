import { requireOrg } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { listEvents, eventRegCounts } from "@/features/events/queries";
import { EventsBoard } from "@/features/events/components/EventsBoard";

// Eventos (Server Component): eventos especiais da org. Inscrição/check-in internos
// via Server Actions. Página pública e pagamento seguem ADIADOS.
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [events, counts, campusRes] = await Promise.all([
    listEvents(supabase, orgId),
    eventRegCounts(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);

  return (
    <EventsBoard
      events={events}
      countByEvent={Object.fromEntries(counts)}
      campuses={campuses}
      activeCampus={activeCampus}
    />
  );
}
