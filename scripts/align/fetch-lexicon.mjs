// Lista os Strong do NT (scripts/align/work/nt/, gerado por fetch-nt.mjs) que ainda não têm
// lote, e monta lotes novos de 80 com o verbete inglês resumido, para tradução. Os lotes já
// existentes (João: lex-01..13) não são tocados; a numeração continua de onde parou.
// Uso: node --env-file=.env.local scripts/align/fetch-lexicon.mjs [ot]   (ot = Strong hebraicos de work/ot)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Rode com --env-file=.env.local");
const supabase = createClient(url, anon, { auth: { persistSession: false } });

const WORK = "scripts/align/work";
const batchFiles = fs.readdirSync(WORK).filter((f) => /^lex-\d+\.input\.json$/.test(f)).sort();
const done = new Set(batchFiles.flatMap((f) => JSON.parse(fs.readFileSync(`${WORK}/${f}`, "utf8")).map((e) => e.strong)));
let next = Math.max(0, ...batchFiles.map((f) => Number(f.match(/\d+/)[0]))) + 1; // lex-100+ não quebra a conta

const strongs = new Set();
const T = process.argv[2] === "ot" ? "ot" : "nt";
for (const f of fs.readdirSync(`${WORK}/${T}`).filter((f) => /^[0-9A-Z]{3}-\d+\.json$/.test(f))) {
  for (const v of JSON.parse(fs.readFileSync(`${WORK}/${T}/${f}`, "utf8")).verses) for (const g of v.greek) if (g.s) strongs.add(g.s);
}
const list = [...strongs].filter((s) => !done.has(s)).sort();
const entries = [];
for (let i = 0; i < list.length; i += 300) {
  const { data, error } = await supabase.from("strongs_lexicon").select("strong, lemma, gloss, definition").in("strong", list.slice(i, i + 300));
  if (error) throw new Error(error.message);
  entries.push(...data.map((e) => ({ ...e, definition: (e.definition ?? "").slice(0, 1200) })));
}
entries.sort((a, b) => a.strong.localeCompare(b.strong));
for (let i = 0; i < entries.length; i += 80, next++) {
  const file = `${WORK}/lex-${String(next).padStart(2, "0")}.input.json`;
  fs.writeFileSync(file, JSON.stringify(entries.slice(i, i + 80), null, 1));
  console.log(file);
}
const found = new Set(entries.map((e) => e.strong));
const missing = list.filter((s) => !found.has(s));
console.log(`${entries.length} verbetes novos de ${list.length} Strong pendentes (${done.size} já em lote)`);
if (missing.length) console.log(`Sem verbete (${missing.length}): ${missing.join(" ")}`);
