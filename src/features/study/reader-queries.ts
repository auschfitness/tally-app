// Leituras da tela de leitura (spec 07). Tabelas bíblicas GLOBAIS (sem org_id, leitura
// livre por RLS). `book` aqui é OSIS ('John'). PostgREST corta em 1000 linhas por
// chamada, então capítulo pagina com range().
import type { DB } from "@/lib/auth/session";
import type { LexShort, OrigWord, TaggedWordRow } from "./reader";

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

export async function getTaggedChapter(supabase: DB, osis: string, chapter: number): Promise<TaggedWordRow[]> {
  return pageAll((from, to) =>
    supabase
      .from("bible_tagged_words")
      .select("verse, position, text, strong")
      .eq("translation", READER_TRANSLATION)
      .eq("book", osis)
      .eq("chapter", chapter)
      .order("verse")
      .order("position")
      .range(from, to),
  );
}

export async function getOriginalChapter(supabase: DB, osis: string, chapter: number): Promise<OrigWord[]> {
  return pageAll((from, to) =>
    supabase
      .from("bible_original_tokens")
      .select("verse, position, surface, strong, translit, lang")
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
