import { requireOrg } from "@/lib/auth/session";
import { loadCalendarSources } from "@/features/calendar/queries";
import { CalendarBoard } from "@/features/calendar/components/CalendarBoard";

// Agenda (Server Component): agregação de leitura de Cultos + Eventos + Escala. Sem
// tabela própria — reusa as queries das features (RLS/archived/campus preservados).
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [sources, campusRes] = await Promise.all([
    loadCalendarSources(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";

  return <CalendarBoard sources={sources} activeCampus={activeCampus} />;
}
