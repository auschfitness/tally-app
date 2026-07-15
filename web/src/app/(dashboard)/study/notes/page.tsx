import { requireOrg } from "@/lib/auth/session";
import { listNotes, listSermons, listSeries } from "@/features/study/queries";
import { NotesBoard } from "@/features/study/components/NotesBoard";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Notas de estudo (Server Component). Mutações via Server Actions.
export default async function StudyNotesPage() {
  const { supabase, orgId } = await requireOrg();
  const [notes, sermons, series] = await Promise.all([
    listNotes(supabase, orgId),
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
  ]);
  const sermonOpts = sermons.map((s) => ({ id: s.id, title: s.title }));
  return (
    <>
      <StudyTabs />
      <NotesBoard notes={notes} sermons={sermonOpts} series={series} />
    </>
  );
}
