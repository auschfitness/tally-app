// Carrega o dicionário UBS traduzido em public.ubs_senses (m56). Junta senses.json (de
// fetch-ubs.mjs) com os lotes ubs-NN.pt.json aprovados por validate-ubs.mjs e com
// domains.pt.json. Sentido sem lote traduzido fica de fora (a tela cai no STEPBible).
// Uso: node scripts/ubs/seed-ubs.mjs            (grava; precisa de SUPABASE_SERVICE_ROLE_KEY)
//      node scripts/ubs/seed-ubs.mjs --check    (só confere a limpeza do texto)
import fs from "node:fs";
import assert from "node:assert/strict";
import { checkBatch } from "./validate-ubs.mjs";

const DIR = "scripts/ubs/work";
import { book, cleanUbs, osisRef } from "./ubs-text.mjs";
export { cleanUbs, osisRef } from "./ubs-text.mjs";

if (process.argv.includes("--check")) {
  assert.equal(cleanUbs("ver {S:04000300700022} e {S:06601100600052}"), "ver Mt 3.7 e Ap 11.6");
  assert.equal(cleanUbs("entre {L:ἀγαπάω<SDBG:ἀγαπάω:000000>}[a] e ({D:25.33}){N:001}."), "entre ἀγαπάω e (25.33).");
  assert.equal(cleanUbs("um | dois<br>três"), "um\n\ndois\n\ntrês");
  assert.equal(osisRef("049004005"), "Eph.4.5");
  assert.equal(cleanUbs("a sarça de {S:00200300200000}."), "a sarça de Êx 3.2.");
  assert.equal(cleanUbs("em {S:04202003700000}"), "em Lc 20.37");
  console.log("ok");
  process.exit(0);
}

const senses = JSON.parse(fs.readFileSync(`${DIR}/senses.json`, "utf8"));
const domains = Object.fromEntries(JSON.parse(fs.readFileSync(`${DIR}/domains.pt.json`, "utf8")).map((d) => [d.code, d.pt]));
const pt = new Map();
// Só lote aprovado pelo conferidor entra (um lote ainda sendo escrito fica de fora).
for (const f of fs.readdirSync(DIR).filter((f) => /^ubs-\d+\.pt\.json$/.test(f))) {
  let out;
  try {
    out = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"));
  } catch {
    console.log(`${f}: JSON inválido, pulado`);
    continue;
  }
  const errors = checkBatch(JSON.parse(fs.readFileSync(`${DIR}/${f.replace(".pt.", ".input.")}`, "utf8")), out);
  if (errors.length) {
    console.log(`${f}: reprovado (${errors.length}), pulado`);
    continue;
  }
  for (const o of out) pt.set(o.id, o);
}
const rows = [];
for (const s of senses) {
  const t = pt.get(s.id);
  if (!t) continue;
  for (const strong of s.strongs) {
    rows.push({
      strong,
      sense_id: s.id,
      lemma: s.lemma,
      entry_code: s.entry_code,
      ord: s.ord,
      glosses: t.glosses_pt.map(cleanUbs).filter(Boolean),
      definition: cleanUbs(t.short_pt) || null,
      comments: cleanUbs(t.comments_pt) || null,
      domains: s.domains.map((c) => domains[c]).filter(Boolean),
      subdomains: s.subdomains.map((c) => domains[c]).filter(Boolean),
      refs: s.refs.filter((r) => book(r.slice(0, 3))).map(osisRef),
    });
  }
}
console.log(`${pt.size} sentidos traduzidos → ${rows.length} linhas`);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Sem service_role: porta temporária tmp_ubs_load (SECURITY DEFINER com senha), chamada
// com a anon key. UBS_LOAD_TOKEN = a senha; a função é apagada depois da carga.
const token = process.env.UBS_LOAD_TOKEN;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !(key || (token && anon))) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou UBS_LOAD_TOKEN + anon key).");
  process.exit(1);
}
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, key || anon, { auth: { persistSession: false } });
let done = 0;
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const { error } = key ? await db.from("ubs_senses").upsert(chunk) : await db.rpc("tmp_ubs_load", { p_token: token, p_rows: chunk });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  done += chunk.length;
}
console.log(`carregado: ${done} linhas`);
