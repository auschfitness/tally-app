import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { listSermons } from "@/features/study/queries";
import { loadTracks } from "@/features/tracks/queries";
import { TrackDetail } from "@/features/tracks/components/TrackDetail";

// Detalhe da trilha (Server Component). Reusa Sticks (nomes + matrícula por campus,
// sempre não arquivadas) e Study (sermões-material via content.track_id — leitura
// da feature já migrada). `campus` do searchParams filtra o select de matrícula,
// espelhando o `inCampus` do legado.
export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campus?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, orgId } = await requireOrg();

  const [{ tracks, enrollments }, people, sermons, campusRes] = await Promise.all([
    loadTracks(supabase, orgId),
    listSticks(supabase, orgId),
    listSermons(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const track = tracks.find((t) => t.id === id);
  if (!track) notFound();

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";

  const trackEnrollments = enrollments.filter((e) => e.track_id === id);
  const enrolledIds = new Set(trackEnrollments.map((e) => e.stick_id));
  const nameByStick = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const options = people
    .filter((p) => p.campus === activeCampus && !enrolledIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }));
  const teaching = sermons
    .filter((s) => s.content && s.content.track_id === id)
    .map((s) => ({ id: s.id, title: s.title, main_passage: s.main_passage }));

  return (
    <TrackDetail
      track={track}
      enrollments={trackEnrollments}
      nameByStick={nameByStick}
      people={options}
      teaching={teaching}
    />
  );
}
