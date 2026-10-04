// Só grava com --load, após SQL e aprovação. --status é leitura.
// node --env-file=.env.local scripts/ubs/seed-hebrew.mjs --status|--load
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DIR = "scripts/ubs/work/hebrew";
assert(process.argv.includes("--load") || process.argv.includes("--status"), "Use --status ou --load");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert(url && anon, "Carregue .env.local");
const db = createClient(url, anon, { auth: { persistSession: false } });
const token = fs.readFileSync(`${DIR}/load-token.txt`, "utf8").trim();
const rpc = async (rows) => {
  const { data, error } = await db.rpc("tmp_ubs_hebrew_load", { p_token: token, p_rows: rows });
  if (error) throw new Error(error.message);
  return data;
};
const before = await rpc([]);
console.log("Antes:", before);
if (process.argv.includes("--load")) {
  const payload = fs.readFileSync(`${DIR}/rows.json`, "utf8");
  const manifest = JSON.parse(fs.readFileSync(`${DIR}/manifest.json`, "utf8"));
  assert.equal(createHash("sha256").update(payload).digest("hex"), manifest.sha256, "Dados mudaram depois de preparados");
  assert(before.database_bytes + manifest.conservativeReserveBytes < 480000000, "Espaço insuficiente: carga suspensa");
  const rows = JSON.parse(payload);
  assert.equal(rows.length, manifest.rows);
  for (let i = 0; i < rows.length; i += 100) {
    const part = rows.slice(i, i + 100);
    const result = await rpc(part);
    assert.equal(result.loaded, part.length);
    if ((i + 100) % 1000 === 0) console.log(`Carregado: ${i + 100}/${rows.length}`);
  }
  const after = await rpc([]);
  assert.equal(after.greek_rows, before.greek_rows, "Contagem do grego mudou");
  assert(after.hebrew_rows >= rows.length, "Carga incompleta");
  const { data, error } = await db.from("ubs_senses").select("definition, refs").eq("strong", "H1254").contains("refs", ["Gen.1.1"]);
  assert(!error && data?.some((s) => s.definition?.includes("existência")), "Sentido de criou em Gn 1.1 ausente");
  console.log("Depois:", after);
  console.log("Carga conferida. Apagar a função com o SQL de encerramento do README.");
}
