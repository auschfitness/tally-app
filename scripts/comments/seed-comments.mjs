// Carga dos comentários bíblicos traduzidos para a tabela bible_commentary (Frente C, spec 09).
// Uso com service_role:
//   node --env-file=.env.local scripts/comments/seed-comments.mjs
// Uso com token temporário via RPC (anon key):
//   LOAD_TOKEN=SENHA node --env-file=.env.local scripts/comments/seed-comments.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.LOAD_TOKEN;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const viaRpc = !key && token && anon;

if (!url || (!key && !viaRpc)) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (ou LOAD_TOKEN + anon key).");
  process.exit(1);
}

const supabase = createClient(url, key || anon, { auth: { persistSession: false } });
const file = path.join("scripts", "comments", "work", "comments-pt.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

// USFM (build-batches) → OSIS (bible_commentary.book, igual ao que a aba consulta e usfmToOsis).
const OSIS = {
  MAT: "Matt", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
  ROM: "Rom", "1CO": "1Cor", "2CO": "2Cor", GAL: "Gal", EPH: "Eph",
  PHP: "Phil", COL: "Col", "1TH": "1Thess", "2TH": "2Thess", "1TI": "1Tim",
  "2TI": "2Tim", TIT: "Titus", PHM: "Phlm", HEB: "Heb", JAS: "Jas",
  "1PE": "1Pet", "2PE": "2Pet", "1JN": "1John", "2JN": "2John", "3JN": "3John",
  JUD: "Jude", REV: "Rev"
};
const rows = data.map((d) => ({
  id: d.id,
  source: d.source === "tyn" ? "tyndale" : d.source,
  book: OSIS[d.book ?? "JHN"] ?? (() => { throw new Error(`livro sem OSIS: ${d.book}`); })(),
  chapter: d.chapter,
  verse_start: d.verse,
  verse_end: d.verse,
  kind: d.kind,
  text_pt: d.text_pt,
  text_en: d.text_en,
}));

console.log(`Carregando ${rows.length} comentários...`);

const BATCH = 100;
let total = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const q = viaRpc
    ? supabase.rpc("tmp_comments_load", { p_token: token, p_rows: chunk })
    : supabase.from("bible_commentary").upsert(chunk, { onConflict: "id" });

  const { error } = await q;
  if (error) {
    console.error("\nErro no lote:", error.message);
    process.exit(1);
  }
  total += chunk.length;
  process.stdout.write(`\rInseridos: ${total}/${rows.length}`);
}

console.log(`\nConcluído com sucesso: ${total} comentários em bible_commentary.`);
