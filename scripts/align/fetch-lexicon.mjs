// Lista os Strong de João (a partir das entradas da Task 9) e monta lotes de 80 com o
// verbete inglês resumido, para tradução.
// Uso: node --env-file=.env.local scripts/align/fetch-lexicon.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Rode com --env-file=.env.local");
const supabase = createClient(url, anon, { auth: { persistSession: false } });
const strongs = new Set();
for (let ch = 1; ch <= 21; ch++) {
  const input = JSON.parse(fs.readFileSync(`scripts/align/work/jhn-${String(ch).padStart(2, "0")}.input.json`, "utf8"));
  for (const v of input.verses) for (const g of v.greek) if (g.s) strongs.add(g.s);
}
const list = [...strongs].sort();
const entries = [];
for (let i = 0; i < list.length; i += 300) {
  const { data, error } = await supabase.from("strongs_lexicon").select("strong, lemma, gloss, definition").in("strong", list.slice(i, i + 300));
  if (error) throw new Error(error.message);
  entries.push(...data.map((e) => ({ ...e, definition: (e.definition ?? "").slice(0, 1200) })));
}
entries.sort((a, b) => a.strong.localeCompare(b.strong));
for (let b = 0; b * 80 < entries.length; b++) {
  const file = `scripts/align/work/lex-${String(b + 1).padStart(2, "0")}.input.json`;
  fs.writeFileSync(file, JSON.stringify(entries.slice(b * 80, b * 80 + 80), null, 1));
  console.log(file);
}
const found = new Set(entries.map((e) => e.strong));
const missing = list.filter((s) => !found.has(s));
console.log(`${entries.length} verbetes de ${list.length} Strong`);
if (missing.length) console.log(`Sem verbete (${missing.length}): ${missing.join(" ")}`);
