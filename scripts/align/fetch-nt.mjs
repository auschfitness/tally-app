// Baixa o Novo Testamento inteiro para o alinhador estatístico: por versículo, o texto da
// Bíblia Livre (helloao, MESMO parse de fetch-john.mjs) e os tokens gregos com Strong.
// Saída: scripts/align/work/nt/<USFM>-<cap>.json = { book, chapter, verses: [{ verse, pt, greek }] }
// Uso: node --env-file=.env.local scripts/align/fetch-nt.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// [USFM do helloao, OSIS da tabela de tokens, nº de capítulos]
const NT = [
  ["MAT", "Matt", 28], ["MRK", "Mark", 16], ["LUK", "Luke", 24], ["JHN", "John", 21], ["ACT", "Acts", 28],
  ["ROM", "Rom", 16], ["1CO", "1Cor", 16], ["2CO", "2Cor", 13], ["GAL", "Gal", 6], ["EPH", "Eph", 6],
  ["PHP", "Phil", 4], ["COL", "Col", 4], ["1TH", "1Thess", 5], ["2TH", "2Thess", 3], ["1TI", "1Tim", 6],
  ["2TI", "2Tim", 4], ["TIT", "Titus", 3], ["PHM", "Phlm", 1], ["HEB", "Heb", 13], ["JAS", "Jas", 5],
  ["1PE", "1Pet", 5], ["2PE", "2Pet", 3], ["1JN", "1John", 5], ["2JN", "2John", 1], ["3JN", "3John", 1],
  ["JUD", "Jude", 1], ["REV", "Rev", 22],
];

function versesFrom(data) {
  const d = data;
  const arr = (d && d.chapter && d.chapter.content) || (d && d.content) || [];
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x && x.type === "verse");
}
function verseText(v) {
  const parts = (v.content || []).map((seg) => {
    if (typeof seg === "string") return seg;
    if (seg && typeof seg.text === "string") return seg.text;
    return "";
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Rode com --env-file=.env.local");
const supabase = createClient(url, anon, { auth: { persistSession: false } });
fs.mkdirSync("scripts/align/work/nt", { recursive: true });

let chapters = 0, verses = 0, tokens = 0;
for (const [usfm, osis, n] of NT) {
  const greekAll = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("bible_original_tokens")
      .select("chapter, verse, position, surface, strong, gloss")
      .eq("book", osis)
      .order("chapter").order("verse").order("position").range(from, from + 999);
    if (error) throw new Error(`${osis}: ${error.message}`);
    greekAll.push(...data);
    if (data.length < 1000) break;
  }
  if (!greekAll.length) throw new Error(`sem tokens para ${osis}`);
  for (let ch = 1; ch <= n; ch++) {
    const r = await fetch(`https://bible.helloao.org/api/por_blj/${usfm}/${ch}.json`);
    if (!r.ok) throw new Error(`helloao ${usfm} ${ch}: HTTP ${r.status}`);
    const pt = versesFrom(await r.json()).map((v) => ({ verse: v.number, pt: verseText(v) }));
    const greek = greekAll.filter((g) => g.chapter === ch);
    const out = pt.map((v) => ({
      ...v,
      greek: greek.filter((g) => g.verse === v.verse).map((g) => ({ p: g.position, w: g.surface, s: g.strong, g: g.gloss })),
    }));
    fs.writeFileSync(`scripts/align/work/nt/${usfm}-${String(ch).padStart(2, "0")}.json`, JSON.stringify({ book: usfm, chapter: ch, verses: out }));
    chapters++; verses += out.length; tokens += greek.length;
  }
  console.log(usfm, "ok", greekAll.length, "tokens gregos");
}
console.log(`NT: ${chapters} capítulos, ${verses} versículos, ${tokens} tokens gregos`);
