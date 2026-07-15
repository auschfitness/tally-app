// Validação/coerção de entrada (fronteira do servidor). O autosave envia um objeto
// tipado (não FormData); ainda assim coagimos status/visibility a valores válidos e
// exigimos título para persistir (o cliente já bloqueia, o servidor confirma).
import type { SermonContent, SermonStatus, SermonVisibility } from "./types";

const STATUS = new Set<SermonStatus>(["draft", "preparing", "ready", "preached", "archived"]);
const VIS = new Set<SermonVisibility>(["private", "leadership", "church", "public"]);

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
