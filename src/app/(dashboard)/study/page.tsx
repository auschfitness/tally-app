import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { listSermons, listSeries } from "@/features/study/queries";
import { SermonLibrary } from "@/features/study/components/SermonLibrary";
import { SermonLibraryV2 } from "@/features/study/components/SermonLibraryV2";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Estudo — Sermões (Server Component): biblioteca de sermões + séries. Editor e
// mutações via Server Actions. `visibility` é rótulo de app (não RLS) — ver README.
// A biblioteca da spec 06 entra atrás de `study.library_v2`; com a flag desligada
// esta tela é exatamente a de hoje (mesmo componente, mesma sub-nav).
export default async function StudyPage() {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  const v2 = flagOn(ctx, "study.library_v2");

  const [sermons, series, campusRes] = await Promise.all([
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  return (
    <>
      <StudyTabs v2={v2} />
      {v2 ? (
        <SermonLibraryV2 sermons={sermons} series={series} campuses={campuses} />
      ) : (
        <SermonLibrary sermons={sermons} series={series} campuses={campuses} />
      )}
    </>
  );
}
