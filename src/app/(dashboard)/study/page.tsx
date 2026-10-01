import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { listScriptures, listSermons, listSeries } from "@/features/study/queries";
import { SermonLibrary, type LibraryView } from "@/features/study/components/SermonLibrary";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Estudo — Sermões (Server Component): biblioteca (por data, série ou livro). O
// segmento vem de `?ver=` (data | serie | livro). Editor e mutações via Server Actions.
// `visibility` é rótulo de app (não RLS) — ver README.
export default async function StudyPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  const { ver } = await searchParams;
  const view: LibraryView = ver === "serie" || ver === "livro" ? ver : "data";

  const [sermons, series, scriptures] = await Promise.all([
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    listScriptures(supabase, orgId),
  ]);

  return (
    <>
      <StudyTabs v2={flagOn(ctx, "study.library_v2")} reader={flagOn(ctx, "study.reader")} />
      <SermonLibrary sermons={sermons} series={series} scriptures={scriptures} ver={view} />
    </>
  );
}
