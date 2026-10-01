// Carrega o dicionário UBS traduzido em public.ubs_senses (m56). Junta senses.json (de
// fetch-ubs.mjs) com os lotes ubs-NN.pt.json aprovados por validate-ubs.mjs e com
// domains.pt.json. Sentido sem lote traduzido fica de fora (a tela cai no STEPBible).
// Uso: node scripts/ubs/seed-ubs.mjs            (grava; precisa de SUPABASE_SERVICE_ROLE_KEY)
//      node scripts/ubs/seed-ubs.mjs --check    (só confere a limpeza do texto)
import fs from "node:fs";
import assert from "node:assert/strict";

const DIR = "scripts/ubs/work";
// BBB da UBS (040 = Mateus) → OSIS do banco e abreviação brasileira.
const BOOKS = [
  ["Matt", "Mt"], ["Mark", "Mc"], ["Luke", "Lc"], ["John", "Jo"], ["Acts", "At"], ["Rom", "Rm"],
  ["1Cor", "1Co"], ["2Cor", "2Co"], ["Gal", "Gl"], ["Eph", "Ef"], ["Phil", "Fp"], ["Col", "Cl"],
  ["1Thess", "1Ts"], ["2Thess", "2Ts"], ["1Tim", "1Tm"], ["2Tim", "2Tm"], ["Titus", "Tt"], ["Phlm", "Fm"],
  ["Heb", "Hb"], ["Jas", "Tg"], ["1Pet", "1Pe"], ["2Pet", "2Pe"], ["1John", "1Jo"], ["2John", "2Jo"],
  ["3John", "3Jo"], ["Jude", "Jd"], ["Rev", "Ap"],
];
const book = (bbb) => BOOKS[Number(bbb) - 40];
export const osisRef = (r) => `${book(r.slice(0, 3))[0]}.${Number(r.slice(3, 6))}.${Number(r.slice(6, 9))}`;

// Marcações da UBS → texto de leitura: {S:ref} vira "Mt 3.7", {L:lema<…>} vira o lema,
// {D:25.33} vira "25.33", notas {N:001} e letras de homógrafo [a] somem, " | " e <br> viram parágrafo.
export function cleanUbs(s) {
  return String(s ?? "")
    .replace(/\{S:(\d{3})(\d{3})(\d{3})\d*\}/g, (_, b, c, v) => (book(b) ? `${book(b)[1]} ${Number(c)}.${Number(v)}` : ""))
    .replace(/\{L:([^<}]+)(<[^}]*)?\}/g, "$1")
    .replace(/\{D:([\d.]+)\}/g, "$1")
    .replace(/\{N:\d+\}/g, "")
    .replace(/(\p{Script=Greek})\[[a-z]\]/gu, "$1")
    .replace(/\s*(\||<br\s*\/?>)\s*/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ([,.;:)])/g, "$1")
    .trim();
}

if (process.argv.includes("--check")) {
  assert.equal(cleanUbs("ver {S:04000300700022} e {S:06601100600052}"), "ver Mt 3.7 e Ap 11.6");
  assert.equal(cleanUbs("entre {L:ἀγαπάω<SDBG:ἀγαπάω:000000>}[a] e ({D:25.33}){N:001}."), "entre ἀγαπάω e (25.33).");
  assert.equal(cleanUbs("um | dois<br>três"), "um\n\ndois\n\ntrês");
  assert.equal(osisRef("049004005"), "Eph.4.5");
  console.log("ok");
  process.exit(0);
}

const senses = JSON.parse(fs.readFileSync(`${DIR}/senses.json`, "utf8"));
const domains = Object.fromEntries(JSON.parse(fs.readFileSync(`${DIR}/domains.pt.json`, "utf8")).map((d) => [d.code, d.pt]));
const pt = new Map();
for (const f of fs.readdirSync(DIR).filter((f) => /^ubs-\d+\.pt\.json$/.test(f))) {
  for (const o of JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"))) pt.set(o.id, o);
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
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, key, { auth: { persistSession: false } });
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await db.from("ubs_senses").upsert(rows.slice(i, i + 500));
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
}
console.log("carregado");
