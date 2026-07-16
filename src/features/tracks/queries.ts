// Consultas de Trilhas. Só os campos necessários, tipadas, tratando ausência.
// RLS filtra por org; `.eq("org_id")` é defesa em profundidade. Etapas vêm por
// `position` asc. `materials` (jsonb) não é lido aqui (fora do escopo desta fatia).
// Nomes de matriculados são resolvidos a montante (page) a partir de Sticks NÃO
// arquivadas (handoff). Ver docs/handoffs/study-trilhas-supabase.md.
import type { DB } from "@/lib/auth/session";
import type { Enrollment, Track, TrackStep } from "./types";

export interface TracksData {
  tracks: Track[];
  enrollments: Enrollment[];
}

// Carrega trilhas + etapas (agrupadas por trilha, ordenadas) + matrículas da org.
export async function loadTracks(supabase: DB, orgId: string): Promise<TracksData> {
  const [tr, ts, en] = await Promise.all([
    supabase.from("tracks").select("id, name, description, type, status").eq("org_id", orgId).order("created_at", { ascending: true }),
    supabase.from("track_steps").select("id, track_id, name, description, position").eq("org_id", orgId).order("position", { ascending: true }),
    supabase
      .from("track_enrollments")
      .select("id, track_id, stick_id, current_step_id, progress, status, started_at, completed_at")
      .eq("org_id", orgId),
  ]);
  if (tr.error) throw new Error(tr.error.message);
  if (ts.error) throw new Error(ts.error.message);
  if (en.error) throw new Error(en.error.message);

  const byTrack = new Map<string, TrackStep[]>();
  for (const s of ts.data ?? []) {
    const step: TrackStep = {
      id: s.id,
      track_id: s.track_id,
      name: s.name ?? "",
      description: s.description ?? "",
      position: s.position ?? 0,
    };
    (byTrack.get(s.track_id) ?? byTrack.set(s.track_id, []).get(s.track_id)!).push(step);
  }

  const tracks: Track[] = (tr.data ?? []).map((t) => ({
    id: t.id,
    name: t.name ?? "",
    description: t.description ?? "",
    type: t.type ?? "",
    status: t.status ?? "active",
    steps: byTrack.get(t.id) ?? [],
  }));

  const enrollments: Enrollment[] = (en.data ?? []).map((e) => ({
    id: e.id,
    track_id: e.track_id,
    stick_id: e.stick_id,
    current_step_id: e.current_step_id ?? null,
    progress: e.progress ?? 0,
    status: e.status ?? "in_progress",
    started_at: e.started_at ?? null,
    completed_at: e.completed_at ?? null,
  }));

  return { tracks, enrollments };
}
