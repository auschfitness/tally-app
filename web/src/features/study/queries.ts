// Consultas de Study/Sermões. Só os campos necessários, tipadas, tratando ausência.
// RLS filtra por org; `.eq("org_id")` é defesa em profundidade. `campus_id`→NOME.
// ⚠️ `service_id`/`preacher_id` NÃO têm FK (handoff) → resolver defensivo, sem contar
// com integridade. `content` (jsonb) preservado 1:1 (nunca null). Ver
// docs/handoffs/study-supabase.md.
import type { DB } from "@/lib/auth/session";
import type { Scripture, Sermon, SermonContent, SermonStatus, SermonVisibility, Series, SeriesStatus } from "./types";

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
      .select("id, title, subtitle, description, campus_id, sermon_date, series_id, service_id, status, visibility, main_passage, big_idea, content")
      .eq("org_id", orgId)
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

// Todas as passagens (sermon_scriptures) da org — alimentam o Mapa de Escrituras e o
// histórico "você já pregou sobre isto". O TEXTO bíblico não vem daqui (é da helloao).
export async function listScriptures(supabase: DB, orgId: string): Promise<Scripture[]> {
  const res = await supabase
    .from("sermon_scriptures")
    .select("id, sermon_id, book, chapter, verse_start, verse_end, reference")
    .eq("org_id", orgId);
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
