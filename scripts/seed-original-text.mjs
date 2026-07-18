// Carregador do texto original (Fase 2) — grego/hebraico com Strong, lema e morfologia.
// Fonte: STEPBible-Data (TAGNT/TAHOT), CC BY 4.0. Dado de referência GLOBAL. Roda com service_role.
//
// Uso genérico (insere de um TSV com CABEÇALHO cujos nomes batem com as colunas da tabela):
//   node scripts/seed-original-text.mjs tokens   ./tokens.tsv
//   node scripts/seed-original-text.mjs lexicon  ./strongs.tsv
//
// tokens.tsv  → colunas: lang, book, chapter, verse, position, surface, lemma, strong, morph, gloss, translit
// strongs.tsv → colunas: strong, lang, lemma, translit, pronunciation, gloss, definition
//
// PREPARO DOS DADOS: o formato bruto do STEPBible (TAGNT/TAHOT) é rico e tabulado; converta-o para
// esses TSVs normalizados antes de rodar (ver handoff estudo-biblico-fase2-original.md). Precisa de
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no ambiente (não commitar a service key).

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const TABLES = {
  tokens: "bible_original_tokens",
  lexicon: "strongs_lexicon",
};
const NUMERIC = new Set(["chapter", "verse", "position"]);

const mode = process.argv[2];
const file = process.argv[3];
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TABLES[mode] || !file) {
  console.error("Uso: node scripts/seed-original-text.mjs <tokens|lexicon> <arquivo.tsv>");
  process.exit(1);
}
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const table = TABLES[mode];
const supabase = createClient(url, key, { auth: { persistSession: false } });

let header = null;
let batch = [];
let total = 0;

function toRow(cols) {
  const row = {};
  header.forEach((name, i) => {
    let v = cols[i] ?? "";
    v = v === "" ? null : v;
    if (v !== null && NUMERIC.has(name)) v = Number(v);
    row[name] = v;
  });
  return row;
}

async function flush() {
  if (batch.length === 0) return;
  const rows = batch;
  batch = [];
  const q = mode === "lexicon"
    ? supabase.from(table).upsert(rows, { onConflict: "strong" })
    : supabase.from(table).insert(rows);
  const { error } = await q;
  if (error) {
    console.error("\nErro no lote:", error.message);
    process.exit(1);
  }
  total += rows.length;
  process.stdout.write(`\rInseridas: ${total}`);
}

// Lê o arquivo inteiro e itera por linha (evita o readline async iterator, que no
// Node 24 lança ERR_USE_AFTER_CLOSE ao fim do stream e perderia o último lote).
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim() === "") continue;
  const cols = line.split("\t");
  if (!header) { header = cols.map((c) => c.trim()); continue; }
  batch.push(toRow(cols));
  if (batch.length >= 2000) await flush();
}
await flush();
console.log(`\nConcluído: ${total} linhas em ${table}.`);
