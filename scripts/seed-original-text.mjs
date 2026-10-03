// Carregador do texto original (Fase 2) — grego/hebraico com Strong, lema e morfologia.
// Fonte: STEPBible-Data (TAGNT/TAHOT), CC BY 4.0. Dado de referência GLOBAL. Roda com service_role.
//
// Uso genérico (insere de um TSV com CABEÇALHO cujos nomes batem com as colunas da tabela):
//   node scripts/seed-original-text.mjs tokens   ./tokens.tsv
//   node scripts/seed-original-text.mjs lexicon  ./strongs.tsv
//   node scripts/seed-original-text.mjs tagged   ./scripts/align/work/tagged-john.tsv
//   node scripts/seed-original-text.mjs lexpt    ./scripts/align/work/lexpt-nt.tsv
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
  tagged: "bible_tagged_verses", // ligação português↔original, uma linha por versículo (spec 07, m58)
  lexpt: "strongs_lexicon",     // só gloss_pt/definition_pt (spec 07)
};
const NUMERIC = new Set(["chapter", "verse", "position"]);

const mode = process.argv[2];
const file = process.argv[3];
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Sem service_role (modos tagged/lexpt): porta temporária tmp_<modo>_load (SECURITY DEFINER com senha),
// chamada com a anon key. LOAD_TOKEN = a senha; a função é apagada depois da carga.
const token = process.env.LOAD_TOKEN;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const viaRpc = !key && (mode === "tagged" || mode === "lexpt") && token && anon;

if (!TABLES[mode] || !file) {
  console.error("Uso: node scripts/seed-original-text.mjs <tokens|lexicon|tagged|lexpt> <arquivo.tsv>");
  process.exit(1);
}
if (!url || !(key || viaRpc)) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (tagged/lexpt: ou LOAD_TOKEN + anon key).");
  process.exit(1);
}

const table = TABLES[mode];
const supabase = createClient(url, key || anon, { auth: { persistSession: false } });

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
  const q = viaRpc
    ? supabase.rpc(`tmp_${mode}_load`, { p_token: token, p_rows: rows })
    : mode === "lexicon" || mode === "lexpt"
    ? supabase.from(table).upsert(rows, { onConflict: "strong" })
    : mode === "tagged"
      ? supabase.from(table).upsert(rows, { onConflict: "translation,book,chapter,verse" })
      : supabase.from(table).insert(rows);
  const { error } = await q;
  if (error) {
    console.error("\nErro no lote:", error.message);
    process.exit(1);
  }
  total += rows.length;
  process.stdout.write(`\rInseridas: ${total}`);
}

// Modo tagged: o TSV continua uma linha por trecho, mas o banco guarda uma linha por versículo
// (m58). Agrupa tudo em memória (ordem do arquivo não importa) e envia em lotes de versículos.
const verses = new Map();
function addTagged(row) {
  const k = `${row.translation}|${row.book}|${row.chapter}|${row.verse}`;
  let v = verses.get(k);
  if (!v) {
    v = { translation: row.translation, book: row.book, chapter: row.chapter, verse: row.verse, parts: [] };
    verses.set(k, v);
  }
  v.parts.push([row.position, row.text ?? "", row.strong ?? null]);
}
function versesToRows() {
  return [...verses.values()].map((v) => ({
    translation: v.translation, book: v.book, chapter: v.chapter, verse: v.verse,
    spans: v.parts.sort((a, b) => a[0] - b[0]).map(([, text, strong]) => [text, strong]),
  }));
}

// Lê o arquivo inteiro e itera por linha (evita o readline async iterator, que no
// Node 24 lança ERR_USE_AFTER_CLOSE ao fim do stream e perderia o último lote).
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim() === "") continue;
  const cols = line.split("\t");
  if (!header) { header = cols.map((c) => c.trim()); continue; }
  if (mode === "tagged") { addTagged(toRow(cols)); continue; }
  batch.push(toRow(cols));
  if (batch.length >= 2000) await flush();
}
if (mode === "tagged") {
  const all = versesToRows();
  for (let i = 0; i < all.length; i += 500) {
    batch = all.slice(i, i + 500);
    await flush();
  }
}
await flush();
console.log(`\nConcluído: ${total} linhas em ${table}.`);

