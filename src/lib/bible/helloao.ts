// Formato da Free Use Bible API (helloao): parse puro + busca do capítulo no SERVIDOR.
// Sem "use client": é usado pela página da leitura (Server Component) e por source.ts.
const BASE = "https://bible.helloao.org/api";

export interface RawVerse {
  type?: string;
  number: number;
  content?: (string | { text?: string })[];
}

export function versesFrom(data: unknown): RawVerse[] {
  const d = data as { chapter?: { content?: unknown }; content?: unknown } | null;
  const arr = (d && d.chapter && d.chapter.content) || (d && d.content) || [];
  if (!Array.isArray(arr)) return [];
  return (arr as RawVerse[]).filter((x) => x && x.type === "verse");
}

export function verseText(v: RawVerse): string {
  const parts = (v.content || []).map((seg) => {
    if (typeof seg === "string") return seg;
    if (seg && typeof seg.text === "string") return seg.text;
    return "";
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Capítulo inteiro, com cache de 1 dia no servidor (o texto não muda).
export async function fetchChapterText(translationId: string, book: string, chapter: number): Promise<{ n: number; text: string }[]> {
  const r = await fetch(`${BASE}/${translationId}/${book}/${chapter}.json`, { next: { revalidate: 86400 } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return versesFrom(await r.json()).map((v) => ({ n: v.number, text: verseText(v) }));
}
