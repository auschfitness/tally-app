import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "@/features/flags/gate";
import { listAllTextNotes, listNotes } from "@/features/study/queries";
import { mergeNotes } from "@/features/study/domain";
import { NotesLibrary } from "@/features/study/components/NotesLibrary";
import { StudyTabs } from "@/features/study/components/StudyTabs";

// Notas (Server Component, spec 10 §5): as do texto bíblico (study_text_notes, do próprio
// autor) e as soltas (study_notes) numa lista só. Mutações via Server Actions.
export default async function StudyNotesPage() {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  const [loose, textNotes] = await Promise.all([listNotes(supabase, orgId), listAllTextNotes(supabase, orgId)]);
  return (
    <>
      <StudyTabs v2={flagOn(ctx, "study.library_v2")} reader={flagOn(ctx, "study.reader")} />
      <NotesLibrary items={mergeNotes(textNotes, loose)} />
    </>
  );
}
