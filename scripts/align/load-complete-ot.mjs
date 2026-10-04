// Exige SQL preparado e aprovação da carga. --status lê; --load grava.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const dir = "scripts/align/work/gem-ot/load";
assert(process.argv.includes("--status") || process.argv.includes("--load"), "Use --status ou --load");
assert(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Carregue .env.local");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const token = fs.readFileSync(`${dir}/token.txt`,"utf8").trim();
const rpc = async (rows) => {
  const {data,error} = await db.rpc("tmp_tagged_ot_load",{p_token:token,p_rows:rows});
  if (error) throw new Error(error.message);
  return data;
};
const before = await rpc([]);
console.log("Antes:",before);
if (process.argv.includes("--load")) {
  const payload = fs.readFileSync(`${dir}/rows.json`,"utf8");
  const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`,"utf8"));
  assert(manifest.build.ready && manifest.pilot.agreement >= 94, "Carga sem validação");
  assert.equal(createHash("sha256").update(payload).digest("hex"),manifest.sha256);
  assert(before.database_bytes + manifest.reserveBytes < 480000000,"Espaço insuficiente");
  const rows = JSON.parse(payload);
  assert.equal(rows.length,manifest.rows);
  for (let i=0;i<rows.length;i+=100) {
    const part=rows.slice(i,i+100);
    assert.equal((await rpc(part)).loaded,part.length);
    // Confere cada lote por leitura pública, antes de avançar.
    for (const book of new Set(part.map((r)=>r.book))) {
      const expected=part.filter((r)=>r.book===book);
      const {data,error}=await db.from("bible_tagged_verses").select("chapter,verse,spans").eq("translation","por_blj").eq("book",book).in("chapter",[...new Set(expected.map((r)=>r.chapter))]);
      assert(!error);
      for (const row of expected) assert.deepEqual(data?.find((r)=>r.chapter===row.chapter&&r.verse===row.verse)?.spans,row.spans,`Falha de leitura ${book} ${row.chapter}:${row.verse}`);
    }
    if ((i+100)%1000===0) console.log(`Conferidos: ${i+100}/${rows.length}`);
  }
  const after=await rpc([]);
  assert.equal(after.nt_verses,before.nt_verses,"Contagem do NT mudou");
  console.log("Depois:",after);
  console.log("Apagar tmp_tagged_ot_load(text,jsonb) no SQL Editor.");
}
