import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { listNotes, listSermons, listSeries } from "@/features/study/queries";
import { NotesBoard } from "@/features/study/components/NotesBoard";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Notas de estudo (Server Component). Mutações via Server Actions.
// A flag `study.library_v2` só troca a SUB-NAV aqui — a tela de notas em si é a de
// hoje nos dois lados da flag (a reforma das notas é o Erro nº 4 da spec, outra fatia).
export default async function StudyNotesPage() {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  const [notes, sermons, series] = await Promise.all([
    listNotes(supabase, orgId),
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
  ]);
  const sermonOpts = sermons.map((s) => ({ id: s.id, title: s.title }));
  return (
    <>
      <StudyTabs v2={flagOn(ctx, "study.library_v2")} />
      <NotesBoard notes={notes} sermons={sermonOpts} series={series} />
    </>
  );
}
