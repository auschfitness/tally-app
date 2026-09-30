// Valida a ligação de um ou mais capítulos e gera o TSV do loader.
// Uso: node scripts/align/validate-alignment.mjs 1        (um capítulo)
//      node scripts/align/validate-alignment.mjs all      (todos + work/tagged-john.tsv)
import fs from "node:fs";

const pad = (n) => String(n).padStart(2, "0");
const EDGE = /^[\s.,;:!?"'“”‘’()\[\]—–-]|[\s.,;:!?"'“”‘’()\[\]—–-]$/;

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

function check(ch) {
  const input = readJson(`scripts/align/work/jhn-${pad(ch)}.input.json`);
  const align = readJson(`scripts/align/work/jhn-${pad(ch)}.align.json`);
  if (!Array.isArray(align)) return { errors: ["a saída precisa ser um array [{ verse, spans }]"], rows: [], coverage: 0 };
  const byVerse = new Map(align.map((a) => [a.verse, a.spans]));
  const errors = [];
  const rows = [];
  let content = 0;
  let linked = 0;
  for (const v of input.verses) {
    const spans = byVerse.get(v.verse);
    if (!Array.isArray(spans)) { errors.push(`v${v.verse}: faltando`); continue; }
    const joined = spans.map((s) => s.t).join("");
    if (joined !== v.pt) errors.push(`v${v.verse}: texto não bate\n  esperado: ${v.pt}\n  obtido:   ${joined}`);
    const allowed = new Set(v.greek.map((g) => g.s).filter(Boolean));
    const used = new Set();
    spans.forEach((s, i) => {
      if (!s.t) errors.push(`v${v.verse}#${i}: trecho vazio`);
      if (s.s) {
        if (!allowed.has(s.s)) errors.push(`v${v.verse}#${i}: ${s.s} não está no grego do versículo`);
        if (EDGE.test(s.t)) errors.push(`v${v.verse}#${i}: trecho ligado com espaço/pontuação na borda: "${s.t}"`);
        used.add(s.s);
      }
      rows.push(["por_blj", "John", ch, v.verse, i + 1, String(s.t ?? "").replace(/\t/g, " "), s.s ?? ""].join("\t"));
    });
    for (const g of v.greek) {
      if (!g.s || g.s === "G3588") continue;
      content++;
      if (used.has(g.s)) linked++;
    }
  }
  const coverage = content ? linked / content : 1;
  if (coverage < 0.85) errors.push(`cobertura ${(coverage * 100).toFixed(1)}% < 85%`);
  return { errors, rows, coverage };
}

const arg = process.argv[2];
const chapters = arg === "all" ? Array.from({ length: 21 }, (_, i) => i + 1) : [Number(arg)];
if (!chapters.every((c) => Number.isInteger(c) && c >= 1 && c <= 21)) {
  console.error("Uso: node scripts/align/validate-alignment.mjs <1-21|all>");
  process.exit(1);
}
let failed = false;
const all = [];
for (const ch of chapters) {
  const { errors, rows, coverage } = check(ch);
  console.log(`João ${ch}: ${errors.length ? "FALHOU" : "ok"} · cobertura ${(coverage * 100).toFixed(1)}%`);
  for (const e of errors) console.log("  " + e);
  failed ||= errors.length > 0;
  all.push(...rows);
}
if (failed) process.exit(1);
if (arg === "all") {
  fs.writeFileSync("scripts/align/work/tagged-john.tsv", ["translation\tbook\tchapter\tverse\tposition\ttext\tstrong", ...all].join("\n") + "\n");
  console.log(`TSV: scripts/align/work/tagged-john.tsv (${all.length} linhas)`);
}
