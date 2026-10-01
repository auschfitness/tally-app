// Monta a entrada da ligação de João: por versículo, o texto da Bíblia Livre (helloao,
// o MESMO parse da tela) e os tokens gregos (bible_original_tokens, leitura pública).
// Uso: node --env-file=.env.local scripts/align/fetch-john.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// cópia do parse de src/lib/bible/source.ts — manter igual
function versesFrom(data) {
  const d = data;
  const arr = (d && d.chapter && d.chapter.content) || (d && d.content) || [];
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x && x.type === "verse");
}
function verseText(v) {
  const segs = v.content || [];
  const parts = segs.map((seg, i) => {
    // ")" da nota de rodapé que a Bíblia Livre deixou fora dela (ver src/lib/bible/helloao.ts)
    if (typeof seg === "string") return segs[i - 1] && segs[i - 1].noteId !== undefined ? seg.replace(/^\s*\)/, "") : seg;
    if (seg && typeof seg.text === "string") return seg.text;
    return "";
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Rode com --env-file=.env.local");
const supabase = createClient(url, anon, { auth: { persistSession: false } });
fs.mkdirSync("scripts/align/work", { recursive: true });

for (let ch = 1; ch <= 21; ch++) {
  const r = await fetch(`https://bible.helloao.org/api/por_blj/JHN/${ch}.json`);
  if (!r.ok) throw new Error(`helloao JHN ${ch}: HTTP ${r.status}`);
  const pt = versesFrom(await r.json()).map((v) => ({ verse: v.number, pt: verseText(v) }));
  const greek = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("bible_original_tokens")
      .select("verse, position, surface, strong, gloss")
      .eq("book", "John").eq("chapter", ch)
      .order("verse").order("position").range(from, from + 999);
    if (error) throw new Error(error.message);
    greek.push(...data);
    if (data.length < 1000) break;
  }
  const verses = pt.map((v) => ({
    ...v,
    greek: greek.filter((g) => g.verse === v.verse).map((g) => ({ p: g.position, w: g.surface, s: g.strong, g: g.gloss })),
  }));
  const file = `scripts/align/work/jhn-${String(ch).padStart(2, "0")}.input.json`;
  fs.writeFileSync(file, JSON.stringify({ chapter: ch, verses }, null, 1));
  console.log(file, verses.length, "versículos");
}
