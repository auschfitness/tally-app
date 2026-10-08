// Confere um lote traduzido (ou todos) dos comentários de João e junta tudo em comments-pt.json.
// Uso: node scripts/comments/validate-comments.mjs 3   |   node scripts/comments/validate-comments.mjs all
// Entrada: work/batch-NN.input.json ; saída esperada: work/batch-NN.pt.json = [{ id, text_pt }] (mesma ordem).
import fs from "node:fs";
import path from "node:path";

const WORK = path.join("scripts", "comments", "work");
const pad = (n) => String(n).padStart(2, "0");

function readJson(file) {
  if (!fs.existsSync(file)) { console.error(`Arquivo ausente: ${file}`); process.exit(1); }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.error(`JSON inválido em ${file}: ${e.message}`); process.exit(1); }
}

const files = fs.existsSync(WORK) ? fs.readdirSync(WORK).filter((f) => /^batch-\d+\.input\.json$/.test(f)).sort() : [];
const arg = process.argv[2];
const batches = arg === "all" ? files.map((f) => Number(f.match(/\d+/)[0])) : [Number(arg)];
if (!batches.length || !batches.every((b) => Number.isInteger(b) && b >= 1)) {
  console.error("Uso: node scripts/comments/validate-comments.mjs <NN|all> (rode antes build-batches.mjs)");
  process.exit(1);
}

const paras = (s) => s.split(/\n{2,}/).filter((p) => p.trim()).length;
const lines = (s) => s.split("\n").filter((p) => p.trim()).length;
// Palavras funcionais do inglês: texto traduzido de verdade quase não tem. \b não entende acento, por isso o lookaround.
const EN = /(?<!\p{L})(the|and|which|with|from|that|this|these|those|was|were|his|her|their|not|are|but|for|has|have|shall|thou|thy|unto)(?!\p{L})/giu;
// Referência no estilo da fonte: "Joh 1:2", "Co1 8:6", "Mat 5:3". O formato pedido é "Jo 1.2", "1Co 8.6".
const OLD_REF = /(?<![\p{L}\d])(?:[A-Z][a-z]{1,2}\d?|\d?[A-Z][a-z]{1,2}) \d{1,3}:\d{1,3}/u;
const COLON_REF = /\d{1,3}:\d{1,3}/;
const CJK_GREEK_HEB = /[Ͱ-Ͽἀ-῿֐-׿]/;

let failed = false;
const all = [];
for (const b of batches) {
  const input = readJson(path.join(WORK, `batch-${pad(b)}.input.json`));
  const out = readJson(path.join(WORK, `batch-${pad(b)}.pt.json`));
  const errors = [], warns = [];
  if (!Array.isArray(out)) errors.push("a saída precisa ser um array [{ id, text_pt }]");
  else {
    if (out.length !== input.length) errors.push(`itens: ${out.length} ≠ ${input.length}`);
    input.forEach((e, i) => {
      const o = out[i];
      if (!o || o.id !== e.id) { errors.push(`#${i}: esperado ${e.id}`); return; }
      const pt = String(o.text_pt ?? "").replace(/\r/g, "").trim();
      const en = e.text;
      if ((pt.match(/\p{L}/gu) ?? []).length < Math.min(6, (en.match(/\p{L}/gu) ?? []).length)) { errors.push(`${e.id}: text_pt vazio ou sem texto`); return; }
      // PT costuma ficar 5% a 25% maior que o EN. Fora de 0,65 a 1,6 é recorte ou enchimento.
      const r = pt.length / en.length;
      if (en.length > 80 && (r < 0.65 || r > 1.6)) errors.push(`${e.id}: tamanho suspeito (${Math.round(r * 100)}% do inglês)`);
      if (pt === en) errors.push(`${e.id}: igual ao inglês`);
      const enWords = (pt.match(EN) ?? []).length;
      const words = (pt.match(/\p{L}+/gu) ?? []).length || 1;
      if (enWords >= 3 && enWords / words > 0.04) errors.push(`${e.id}: parece ter inglês (${enWords} palavras do inglês)`);
      if (CJK_GREEK_HEB.test(pt) && !CJK_GREEK_HEB.test(en)) errors.push(`${e.id}: grego/hebraico que não estava no original`);
      if (OLD_REF.test(pt)) errors.push(`${e.id}: referência no formato antigo ("${pt.match(OLD_REF)[0]}"), use "Jo 1.2"`);
      else if (COLON_REF.test(pt)) errors.push(`${e.id}: referência com dois-pontos ("${pt.match(COLON_REF)[0]}"), use ponto: "Jo 1.2"`);
      if (/&c\./.test(pt)) errors.push(`${e.id}: "&c." sobrou; use "etc."`);
      if (/—|–/.test(pt)) errors.push(`${e.id}: travessão longo; use vírgula, ponto ou hífen`);
      if (paras(pt) !== paras(en)) warns.push(`${e.id}: parágrafos ${paras(pt)} ≠ ${paras(en)}`);
      else if (lines(pt) !== lines(en)) warns.push(`${e.id}: linhas ${lines(pt)} ≠ ${lines(en)}`);
      all.push({ id: e.id, book: e.book ?? "JHN", source: e.source, chapter: e.chapter, verse: e.verse, kind: e.kind, text_en: en, text_pt: pt });
    });
  }
  console.log(`lote ${b}: ${errors.length ? "FALHOU" : "ok"}`);
  for (const x of errors) console.log("  " + x);
  for (const x of warns) console.log("  aviso " + x);
  failed ||= errors.length > 0;
}
if (failed) process.exit(1);
if (arg === "all") {
  fs.writeFileSync(path.join(WORK, "comments-pt.json"), JSON.stringify(all, null, 1));
  console.log(`JSON: ${path.join(WORK, "comments-pt.json")} (${all.length} blocos)`);
}
