// Leituras da tela de leitura (spec 07). Tabelas bíblicas GLOBAIS (sem org_id, leitura
// livre por RLS). `book` aqui é OSIS ('John'). PostgREST corta em 1000 linhas por
// chamada, então capítulo pagina com range().
import type { DB } from "@/lib/auth/session";
import { isHlColor, type HlColor, type LexShort, type OrigWord, type TaggedWordRow } from "./reader";

export const READER_TRANSLATION = "por_blj"; // Bíblia Livre (CC BY 4.0)
const PAGE = 1000;

async function pageAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

// Uma linha por versículo (m58): spans = [[texto, strong|null], ...] na ordem.
// Um capítulo tem no máximo 176 versículos, cabe numa chamada só.
export async function getTaggedChapter(supabase: DB, osis: string, chapter: number): Promise<TaggedWordRow[]> {
  const { data, error } = await supabase
    .from("bible_tagged_verses")
    .select("verse, spans")
    .eq("translation", READER_TRANSLATION)
    .eq("book", osis)
    .eq("chapter", chapter)
    .order("verse");
  if (error) throw new Error(error.message);
  const out: TaggedWordRow[] = [];
  for (const row of data ?? []) {
    const spans = row.spans as [string, string | null][];
    spans.forEach(([text, strong], i) => out.push({ verse: row.verse, position: i + 1, text, strong }));
  }
  return out;
}

export async function getOriginalChapter(supabase: DB, osis: string, chapter: number): Promise<OrigWord[]> {
  return pageAll((from, to) =>
    supabase
      .from("bible_original_tokens")
      .select("verse, position, surface, strong, translit, lang, morph, lemma")
      .eq("book", osis)
      .eq("chapter", chapter)
      .order("verse")
      .order("position")
      .range(from, to),
  );
}

// Léxico curto (balão e modo Original). A definição longa é buscada na aba Palavra.
export async function getLexShort(supabase: DB, strongs: string[]): Promise<Record<string, LexShort>> {
  const out: Record<string, LexShort> = {};
  for (let i = 0; i < strongs.length; i += 300) {
    const { data, error } = await supabase
      .from("strongs_lexicon")
      .select("strong, lemma, translit, gloss, gloss_pt")
      .in("strong", strongs.slice(i, i + 300));
    if (error) throw new Error(error.message);
    for (const l of data ?? []) out[l.strong] = l;
  }
  return out;
}

// Marcas da pessoa no capítulo (spec 08): cor por versículo e versículos com nota.
// RLS já devolve só as do autor.
export async function getChapterMarks(supabase: DB, orgId: string, osis: string, chapter: number): Promise<{ highlights: Record<number, HlColor>; noted: number[] }> {
  const [hl, notes] = await Promise.all([
    supabase.from("study_highlights").select("verse, color").eq("org_id", orgId).eq("book", osis).eq("chapter", chapter),
    supabase.from("study_text_notes").select("verse_start").eq("org_id", orgId).eq("book", osis).eq("chapter", chapter).not("verse_start", "is", null).is("deleted_at", null),
  ]);
  const highlights: Record<number, HlColor> = {};
  for (const r of hl.data ?? []) if (isHlColor(r.color)) highlights[r.verse] = r.color;
  const noted = [...new Set((notes.data ?? []).map((n) => n.verse_start).filter((v): v is number => v != null))];
  return { highlights, noted };
}
