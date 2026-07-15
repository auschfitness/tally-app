import { requireOrg } from "@/lib/auth/session";
import { listSermons, listSeries } from "@/features/study/queries";
import { SermonLibrary } from "@/features/study/components/SermonLibrary";

// Estudo — Sermões (Server Component): biblioteca de sermões + séries. Editor e
// mutações via Server Actions. `visibility` é rótulo de app (não RLS) — ver README.
export default async function StudyPage() {
  const { supabase, orgId } = await requireOrg();

  const [sermons, series, campusRes] = await Promise.all([
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  return <SermonLibrary sermons={sermons} series={series} campuses={campuses} />;
}
