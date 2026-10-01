// Confere um lote traduzido (ou todos) e gera o TSV do modo `lexpt` do loader.
// Uso: node scripts/align/validate-lexicon.mjs 3   |   node scripts/align/validate-lexicon.mjs all
import fs from "node:fs";

const pad = (n) => String(n).padStart(2, "0");

// Arquivo ausente ou JSON quebrado vira mensagem legível, não stack trace.
function readJson(file) {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ausente: ${file}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`JSON inválido em ${file}: ${e.message}`);
    process.exit(1);
  }
}

const files = fs.existsSync("scripts/align/work")
  ? fs.readdirSync("scripts/align/work").filter((f) => /^lex-\d+\.input\.json$/.test(f)).sort()
  : [];
const arg = process.argv[2];
const batches = arg === "all" ? files.map((f) => Number(f.match(/\d+/)[0])) : [Number(arg)];
if (!batches.length || !batches.every((b) => Number.isInteger(b) && b >= 1)) {
  console.error("Uso: node scripts/align/validate-lexicon.mjs <NN|all> (rode antes fetch-lexicon.mjs)");
  process.exit(1);
}
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
let failed = false;
const rows = [];
for (const b of batches) {
  const input = readJson(`scripts/align/work/lex-${pad(b)}.input.json`);
  const out = readJson(`scripts/align/work/lex-${pad(b)}.pt.json`);
  const errors = [];
  if (!Array.isArray(out)) errors.push("a saída precisa ser um array [{ strong, gloss_pt, definition_pt }]");
  else {
    if (out.length !== input.length) errors.push(`itens: ${out.length} ≠ ${input.length}`);
    input.forEach((e, i) => {
      const o = out[i];
      if (!o || o.strong !== e.strong) { errors.push(`#${i}: esperado ${e.strong}`); return; }
      if (!clean(o.gloss_pt)) errors.push(`${e.strong}: gloss_pt vazio`);
      if (clean(o.gloss_pt).split(/\s+/).length > 8) errors.push(`${e.strong}: gloss_pt longo demais`);
      // Pega "tradução" que só recortou o verbete inglês: sobra inglês, hebraico, colchete do LXX ou quase nada.
      const g = clean(o.gloss_pt), d = clean(o.definition_pt);
      if (/[Ͱ-Ͽἀ-῿֐-׿]/.test(g)) errors.push(`${e.strong}: gloss_pt com grego/hebraico`);
      if (/^[a-z]/.test(g) && g.toLowerCase() === clean(e.gloss).toLowerCase()) console.log(`  aviso ${e.strong}: gloss_pt igual ao inglês ("${g}"), confira`);
      if ((d.match(/\p{L}/gu) ?? []).length < 6) errors.push(`${e.strong}: definition_pt vazia ou sem texto`);
      // \b do JS não entende acento ("Ofício" casaria "of"); por isso o lookaround com \p{L}. Minúsculo: "Is 49.6" é Isaías.
      if (/[֐-׿[\]]|LXX|(?<!\p{L})(the|of|and|which|with|from|to|is)(?!\p{L})/u.test(d)) errors.push(`${e.strong}: definition_pt com inglês/hebraico/LXX`);
      rows.push([e.strong, e.strong.startsWith("H") ? "hbo" : "grc", clean(o.gloss_pt), clean(o.definition_pt)].join("\t"));
    });
  }
  console.log(`lote ${b}: ${errors.length ? "FALHOU" : "ok"}`);
  for (const x of errors) console.log("  " + x);
  failed ||= errors.length > 0;
}
if (failed) process.exit(1);
if (arg === "all") {
  fs.writeFileSync("scripts/align/work/lexpt-nt.tsv", ["strong\tlang\tgloss_pt\tdefinition_pt", ...rows].join("\n") + "\n");
  console.log(`TSV: scripts/align/work/lexpt-nt.tsv (${rows.length} linhas)`);
}
