// Modelos de domínio de Study/Sermões. O corpo do sermão é um DOCUMENTO em
// `content` jsonb (seções do canvas). `main_passage` e `big_idea` (= "Ideia central")
// são colunas próprias. Ver docs/handoffs/study-supabase.md.
//
// ⚠️ `visibility` é RÓTULO DE APP, não segurança: a RLS só filtra por org
// (is_org_member). Qualquer membro lê todos os sermões da org. NÃO confiar nele.

export type SermonStatus = "draft" | "preparing" | "ready" | "preached" | "archived";
export type SermonVisibility = "private" | "leadership" | "church" | "public";
export type SeriesStatus = "planning" | "active" | "completed" | "archived";
export type NoteScope = "personal" | "shared";

// Seções do canvas dentro de `content`. `notes` é o corpo aberto; as demais são
// estrutura opcional. Preserva o shape do legado (nunca null no banco).
export interface SermonContent {
  outline?: string;
  notes?: string;
  illustrations?: string;
  application?: string;
  prayer_response?: string;
  track_id?: string | null;
  [key: string]: unknown; // preserva sub-campos extras do blob sem perder nada
}

export interface Sermon {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  campus: string;
  sermon_date: string;
  series_id: string | null;
  service_id: string | null;
  status: SermonStatus;
  visibility: SermonVisibility;
  main_passage: string;
  big_idea: string;
  content: SermonContent;
}

export interface Series {
  id: string;
  title: string;
  description: string;
  theme: string;
  cover_image: string;
  start_date: string;
  end_date: string;
  status: SeriesStatus;
}

export interface Scripture {
  id: string;
  sermon_id: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  reference: string;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  scope: NoteScope;
  sermon_id: string | null;
  series_id: string | null;
  scripture_ref: string;
  topic: string;
  tags: string[];
}
