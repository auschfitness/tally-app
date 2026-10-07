// Texto dos versículos no navegador, do mesmo banco que a leitura usa
// (bible_tagged_verses, Bíblia Livre). Serve a Notas e ao modo púlpito.
import { createClient } from "@/lib/supabase/client";
import { usfmToOsis } from "@/lib/bible/osis";
import { READER_TRANSLATION } from "./reader-queries";
import { curlyQuotes } from "./reader";

export interface VerseText {
  n: number;
  text: string;
}

// `verseStart` nulo = capítulo inteiro (limitado para não despejar um Salmo 119 no púlpito).
export async function loadVerses(book: string, chapter: number, verseStart: number | null, verseEnd: number | null, max = 60): Promise<VerseText[]> {
  const osis = usfmToOsis(book);
  if (!osis || !chapter) return [];
  let q = createClient()
    .from("bible_tagged_verses")
    .select("verse, spans")
    .eq("translation", READER_TRANSLATION)
    .eq("book", osis)
    .eq("chapter", chapter);
  if (verseStart) q = q.gte("verse", verseStart).lte("verse", verseEnd ?? verseStart);
  const { data } = await q.order("verse").limit(max);
  return (data ?? []).map((r) => ({
    n: r.verse,
    text: curlyQuotes((r.spans as [string, string | null][]).map(([text, strong]) => ({ text, strong })))
      .map((s) => s.text)
      .join("")
      .trim(),
  }));
}
