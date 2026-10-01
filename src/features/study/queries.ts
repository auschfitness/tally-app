// Consultas de Study/Sermões. Só os campos necessários, tipadas, tratando ausência.
// RLS filtra por org; `.eq("org_id")` é defesa em profundidade. `campus_id`→NOME.
// ⚠️ `service_id`/`preacher_id` NÃO têm FK (handoff) → resolver defensivo, sem contar
// com integridade. `content` (jsonb) preservado 1:1 (nunca null). Ver
// docs/handoffs/study-supabase.md.
import type { DB } from "@/lib/auth/session";
import { TRASH_TABLE, trashCutoff, type TrashItem } from "./domain";
import { chapterLabel } from "./reader";
import { osisToUsfm } from "@/lib/bible/osis";
import type { NoteScope, Scripture, Sermon, SermonContent, SermonStatus, SermonVisibility, Series, SeriesStatus, StudyNote } from "./types";

const SERMON_STATUS = new Set<SermonStatus>(["draft", "preparing", "ready", "preached", "archived"]);
const SERMON_VIS = new Set<SermonVisibility>(["private", "leadership", "church", "public"]);
const SERIES_STATUS = new Set<SeriesStatus>(["planning", "active", "completed", "archived"]);
function statusOr(v: string | null): SermonStatus {
  return v && SERMON_STATUS.has(v as SermonStatus) ? (v as SermonStatus) : "draft";
}
function visOr(v: string | null): SermonVisibility {
  return v && SERMON_VIS.has(v as SermonVisibility) ? (v as SermonVisibility) : "church";
}
function seriesStatusOr(v: string | null): SeriesStatus {
  return v && SERIES_STATUS.has(v as SeriesStatus) ? (v as SeriesStatus) : "planning";
}

// content é jsonb NOT NULL do banco; garante objeto (nunca null/array) sem reformatar.
function asContent(v: unknown): SermonContent {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as SermonContent) : {};
}

async function campusNameById(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const res = await supabase.from("campuses").select("id, name").eq("org_id", orgId);
  const map = new Map<string, string>();
  for (const c of res.data ?? []) map.set(c.id, c.name);
  return map;
}

export async function listSermons(supabase: DB, orgId: string): Promise<Sermon[]> {
  const [res, campusMap] = await Promise.all([
    supabase
      .from("sermons")
      .select("id, title, subtitle, description, campus_id, sermon_date, series_id, service_id, status, visibility, main_passage, big_idea, content, updated_at")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .order("sermon_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    campusNameById(supabase, orgId),
  ]);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? "",
    subtitle: r.subtitle ?? "",
    description: r.description ?? "",
    campus: (r.campus_id && campusMap.get(r.campus_id)) || "",
    sermon_date: r.sermon_date ?? "",
    series_id: r.series_id ?? null,
    service_id: r.service_id ?? null, // sem FK — pode ser uuid órfão; resolver defensivo na UI
    status: statusOr(r.status),
    visibility: visOr(r.visibility),
    main_passage: r.main_passage ?? "",
    big_idea: r.big_idea ?? "",
    content: asContent(r.content),
    updated_at: r.updated_at ?? "",
  }));
}

export async function listSeries(supabase: DB, orgId: string): Promise<Series[]> {
  const res = await supabase
    .from("series")
    .select("id, title, description, theme, cover_image, start_date, end_date, status")
    .eq("org_id", orgId)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? "",
    description: r.description ?? "",
    theme: r.theme ?? "",
    cover_image: r.cover_image ?? "",
    start_date: r.start_date ?? "",
    end_date: r.end_date ?? "",
    status: seriesStatusOr(r.status),
  }));
}

// Notas de estudo da org (mais recentes primeiro). tags é text[] NOT NULL (default {}).
export async function listNotes(supabase: DB, orgId: string): Promise<StudyNote[]> {
  const res = await supabase
    .from("study_notes")
    .select("id, title, content, scope, sermon_id, series_id, scripture_ref, topic, tags")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? "",
    content: r.content ?? "",
    scope: (r.scope === "shared" ? "shared" : "personal") as NoteScope,
    sermon_id: r.sermon_id ?? null,
    series_id: r.series_id ?? null,
    scripture_ref: r.scripture_ref ?? "",
    topic: r.topic ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
  }));
}

// Todas as passagens (sermon_scriptures) da org — alimentam o Mapa de Escrituras e o
// histórico "você já pregou sobre isto". O TEXTO bíblico não vem daqui (é da helloao).
export async function listScriptures(supabase: DB, orgId: string): Promise<Scripture[]> {
  const res = await supabase
    .from("sermon_scriptures")
    .select("id, sermon_id, book, chapter, verse_start, verse_end, reference, sermons!inner(deleted_at)")
    .eq("org_id", orgId)
    .is("sermons.deleted_at", null); // passagens de sermão na lixeira não entram no mapa
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    id: r.id,
    sermon_id: r.sermon_id,
    book: r.book,
    chapter: r.chapter,
    verse_start: r.verse_start ?? null,
    verse_end: r.verse_end ?? null,
    reference: r.reference,
  }));
}

// Lixeira: primeiro apaga de vez o que passou de 30 dias (ponytail: limpeza só quando
// alguém abre a lixeira; até lá o item já some das listas. Um pg_cron diário se precisar),
// depois lista o resto, mais recente primeiro. Notas do texto são só do autor (RLS).
export async function listTrash(supabase: DB, orgId: string): Promise<TrashItem[]> {
  const cutoff = trashCutoff();
  await Promise.all(
    Object.values(TRASH_TABLE).map((t) => supabase.from(t).delete().eq("org_id", orgId).lt("deleted_at", cutoff)),
  );
  const [s, n, t] = await Promise.all([
    supabase.from("sermons").select("id, title, deleted_at").eq("org_id", orgId).not("deleted_at", "is", null),
    supabase.from("study_notes").select("id, title, deleted_at").eq("org_id", orgId).not("deleted_at", "is", null),
    supabase.from("study_text_notes").select("id, book, chapter, verse_start, body, deleted_at").eq("org_id", orgId).not("deleted_at", "is", null),
  ]);
  const err = s.error ?? n.error ?? t.error;
  if (err) throw new Error(err.message);
  const items: TrashItem[] = [
    ...(s.data ?? []).map((r) => ({ kind: "sermon" as const, id: r.id, title: r.title || "Sem título", deleted_at: r.deleted_at! })),
    ...(n.data ?? []).map((r) => ({ kind: "note" as const, id: r.id, title: r.title || "Nota sem título", deleted_at: r.deleted_at! })),
    ...(t.data ?? []).map((r) => {
      const where = r.chapter ? chapterLabel({ book: osisToUsfm(r.book) ?? r.book, chapter: r.chapter }) + (r.verse_start ? `:${r.verse_start}` : "") : r.book;
      const body = r.body.length > 60 ? r.body.slice(0, 60) + "…" : r.body;
      return { kind: "text_note" as const, id: r.id, title: `${where} · ${body}`, deleted_at: r.deleted_at! };
    }),
  ];
  return items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
}
