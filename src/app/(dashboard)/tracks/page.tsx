import { requireOrg } from "@/lib/auth/session";
import { loadTracks } from "@/features/tracks/queries";
import { TracksBoard } from "@/features/tracks/components/TracksBoard";

// Trilhas (Server Component): biblioteca de trilhas de discipulado a partir das
// tabelas relacionais (tracks/track_steps/track_enrollments). Mutações via Server
// Actions. Ver docs/handoffs/study-trilhas-supabase.md.
export default async function TracksPage() {
  const { supabase, orgId } = await requireOrg();
  const { tracks, enrollments } = await loadTracks(supabase, orgId);
  return <TracksBoard tracks={tracks} enrollments={enrollments} />;
}
