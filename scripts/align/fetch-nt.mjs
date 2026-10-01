// Baixa um Testamento inteiro para o alinhador estatístico: por versículo, o texto da
// Bíblia Livre (helloao, MESMO parse de fetch-john.mjs) e os tokens originais com Strong.
// Saída: scripts/align/work/<nt|ot>/<USFM>-<cap>.json = { book, chapter, verses: [{ verse, pt, greek }] }
// (no AT `greek` guarda o hebraico/aramaico; o nome ficou para o stat_align ler os dois iguais)
// Uso: node --env-file=.env.local scripts/align/fetch-nt.mjs [ot]
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
const OT = [
  ["GEN", "Gen", 50], ["EXO", "Exod", 40], ["LEV", "Lev", 27], ["NUM", "Num", 36], ["DEU", "Deut", 34],
  ["JOS", "Josh", 24], ["JDG", "Judg", 21], ["RUT", "Ruth", 4], ["1SA", "1Sam", 31], ["2SA", "2Sam", 24],
  ["1KI", "1Kgs", 22], ["2KI", "2Kgs", 25], ["1CH", "1Chr", 29], ["2CH", "2Chr", 36], ["EZR", "Ezra", 10],
  ["NEH", "Neh", 13], ["EST", "Esth", 10], ["JOB", "Job", 42], ["PSA", "Ps", 150], ["PRO", "Prov", 31],
  ["ECC", "Eccl", 12], ["SNG", "Song", 8], ["ISA", "Isa", 66], ["JER", "Jer", 52], ["LAM", "Lam", 5],
  ["EZK", "Ezek", 48], ["DAN", "Dan", 12], ["HOS", "Hos", 14], ["JOL", "Joel", 3], ["AMO", "Amos", 9],
  ["OBA", "Obad", 1], ["JON", "Jonah", 4], ["MIC", "Mic", 7], ["NAM", "Nah", 3], ["HAB", "Hab", 3],
  ["ZEP", "Zeph", 3], ["HAG", "Hag", 2], ["ZEC", "Zech", 14], ["MAL", "Mal", 4],
];
const ot = process.argv[2] === "ot";
const DIR = `scripts/align/work/${ot ? "ot" : "nt"}`;

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
fs.mkdirSync(DIR, { recursive: true });

let chapters = 0, verses = 0, tokens = 0;
for (const [usfm, osis, n] of ot ? OT : NT) {
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
    fs.writeFileSync(`${DIR}/${usfm}-${String(ch).padStart(2, "0")}.json`, JSON.stringify({ book: usfm, chapter: ch, verses: out }));
    chapters++; verses += out.length; tokens += greek.length;
  }
  console.log(usfm, "ok", greekAll.length, "tokens originais");
}
console.log(`${ot ? "AT" : "NT"}: ${chapters} capítulos, ${verses} versículos, ${tokens} tokens originais`);
