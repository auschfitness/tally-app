// Validação/coerção de entrada (fronteira do servidor). O autosave envia um objeto
// tipado (não FormData); ainda assim coagimos status/visibility a valores válidos e
// exigimos título para persistir (o cliente já bloqueia, o servidor confirma).
import { parseTags } from "./domain";
import type { NoteScope, SeriesStatus, SermonContent, SermonStatus, SermonVisibility } from "./types";

const STATUS = new Set<SermonStatus>(["draft", "preparing", "ready", "preached", "archived"]);
const VIS = new Set<SermonVisibility>(["private", "leadership", "church", "public"]);
const SERIES_STATUS = ["planning", "active", "completed", "archived"] as const;

export interface SeriesInput {
  title: string;
  description: string;
  theme: string;
  start_date: string;
  end_date: string;
  status: SeriesStatus;
}
export type ValidatedSeries =
  | { ok: true; data: SeriesInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export interface NoteInput {
  title: string;
  content: string;
  scope: NoteScope;
  topic: string;
  sermonId: string | null;
  seriesId: string | null;
  scriptureRef: string;
  tags: string[];
}
export type ValidatedNote =
  | { ok: true; data: NoteInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseNoteInput(fd: FormData): ValidatedNote {
  const title = String(fd.get("title") ?? "").trim();
  const content = String(fd.get("content") ?? "").trim();
  // Precisa de título OU conteúdo (a nota não pode ser totalmente vazia).
  if (!title && !content) return { ok: false, fieldErrors: { title: ["Dê um título ou escreva algo."] } };
  return {
    ok: true,
    data: {
      title,
      content,
      scope: String(fd.get("scope") ?? "") === "shared" ? "shared" : "personal",
      topic: String(fd.get("topic") ?? "").trim(),
      sermonId: String(fd.get("sermonId") ?? "").trim() || null,
      seriesId: String(fd.get("seriesId") ?? "").trim() || null,
      scriptureRef: String(fd.get("scriptureRef") ?? "").trim(),
      tags: parseTags(String(fd.get("tags") ?? "")),
    },
  };
}

export function parseSeriesInput(fd: FormData): ValidatedSeries {
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { ok: false, fieldErrors: { title: ["Dê um título à série."] } };
  const status = String(fd.get("status") ?? "");
  return {
    ok: true,
    data: {
      title,
      description: String(fd.get("description") ?? "").trim(),
      theme: String(fd.get("theme") ?? "").trim(),
      start_date: String(fd.get("start_date") ?? ""),
      end_date: String(fd.get("end_date") ?? ""),
      status: (SERIES_STATUS as readonly string[]).includes(status) ? (status as SeriesStatus) : "planning",
    },
  };
}

export interface SermonSaveInput {
  id: string | null;
  title: string;
  subtitle: string;
  main_passage: string;
  big_idea: string;
  status: string;
  visibility: string;
  campus: string;
  sermon_date: string;
  series_id: string | null;
  service_id: string | null;
  content: SermonContent;
}

export interface CleanSermon {
  title: string;
  subtitle: string;
  main_passage: string;
  big_idea: string;
  status: SermonStatus;
  visibility: SermonVisibility;
  campus: string;
  sermon_date: string;
  series_id: string | null;
  service_id: string | null;
  content: SermonContent;
}

export type Coerced =
  | { ok: true; data: CleanSermon }
  | { ok: false; message: string };

export function coerceSermon(input: SermonSaveInput): Coerced {
  const title = (input.title ?? "").trim();
  if (!title) return { ok: false, message: "Dê um título para salvar." };
  return {
    ok: true,
    data: {
      title,
      subtitle: (input.subtitle ?? "").trim(),
      main_passage: (input.main_passage ?? "").trim(),
      big_idea: (input.big_idea ?? "").trim(),
      status: STATUS.has(input.status as SermonStatus) ? (input.status as SermonStatus) : "draft",
      visibility: VIS.has(input.visibility as SermonVisibility) ? (input.visibility as SermonVisibility) : "church",
      campus: (input.campus ?? "").trim(),
      sermon_date: input.sermon_date ?? "",
      series_id: input.series_id || null,
      service_id: input.service_id || null,
      // content: garante objeto (jsonb NOT NULL), preserva o shape sem reformatar.
      content: input.content && typeof input.content === "object" && !Array.isArray(input.content) ? input.content : {},
    },
  };
}
