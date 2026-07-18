// Carregador das referências cruzadas (Treasury of Scripture Knowledge, via openbible.info, CC BY).
// Dado de referência GLOBAL (tabela public.cross_references, sem org_id). Roda UMA vez.
//
// Como usar (na máquina do dono / Claude Code — precisa do service_role, que NÃO fica no repo):
//   1. Baixe o dataset em https://www.openbible.info/labs/cross-references/ (zip ~2 MB, CC BY),
//      extraia o arquivo TSV (ex.: cross_references.txt).
//   2. Exporte as variáveis:
//        export SUPABASE_URL="https://zzgxeylyrtzsqcdguxql.supabase.co"
//        export SUPABASE_SERVICE_ROLE_KEY="...(painel Supabase → Project Settings → API)"
//   3. Rode:
//        node scripts/seed-cross-references.mjs ./cross_references.txt
//
// Formato de cada linha (TSV): "From Verse<TAB>To Verse<TAB>Votes"
//   From Verse: "John.10.7"      To Verse: "John.10.9" ou faixa "John.10.7-John.10.9"
// Os códigos de livro são os do openbible (OSIS-like: Gen, Exod, Matt, John, ...). O front mapeia
// esses códigos para os que a UI/helloao usa (ver handoff estudo-biblico-fase1b-referencias.md).

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import readline from "node:readline";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];

if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
if (!file) {
  console.error("Uso: node scripts/seed-cross-references.mjs <caminho/cross_references.txt>");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

function parseVerse(v) {
  const m = (v || "").trim().match(/^(.+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) };
}
function parseTo(to) {
  const [a, b] = (to || "").split("-");
  const from = parseVerse(a);
  if (!from) return null;
  let end = from.verse;
  if (b) {
    const e = parseVerse(b);
    if (e) end = e.verse; // fim da faixa (mesmo capítulo na esmagadora maioria)
  }
  return { book: from.book, chapter: from.chapter, verse: from.verse, end };
}

let batch = [];
let total = 0;

async function flush() {
  if (batch.length === 0) return;
  const rows = batch;
  batch = [];
  const { error } = await supabase.from("cross_references").insert(rows);
  if (error) {
    console.error("\nErro ao inserir lote:", error.message);
    process.exit(1);
  }
  total += rows.length;
  process.stdout.write(`\rInseridas: ${total}`);
}

const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
for await (const line of rl) {
  const t = line.trim();
  if (!t || t.startsWith("#") || t.startsWith("From")) continue; // vazio / comentário / cabeçalho
  const [fromV, toV, votesStr] = t.split("\t");
  const f = parseVerse(fromV);
  const to = parseTo(toV);
  if (!f || !to) continue;
  batch.push({
    from_book: f.book,
    from_chapter: f.chapter,
    from_verse: f.verse,
    to_book: to.book,
    to_chapter: to.chapter,
    to_verse_start: to.verse,
    to_verse_end: to.end !== to.verse ? to.end : null,
    votes: Number.parseInt(votesStr, 10) || 0,
  });
  if (batch.length >= 2000) await flush();
}
await flush();
console.log(`\nConcluído: ${total} referências cruzadas carregadas.`);
