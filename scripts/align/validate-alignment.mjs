// Valida a ligação de um ou mais capítulos e gera o TSV do loader.
// Uso: node scripts/align/validate-alignment.mjs 1        (um capítulo)
//      node scripts/align/validate-alignment.mjs all      (todos + work/tagged-john.tsv)
//      ALIGN_TAG=stat node scripts/align/validate-alignment.mjs nt
//          (NT inteiro, menos João: work/nt/<LIVRO>-NN.align.stat.json -> work/tagged-nt-stat.tsv)
import fs from "node:fs";

const pad = (n) => String(n).padStart(2, "0");
// ALIGN_TAG=stat: valida jhn-NN.align.stat.json e grava tagged-john-stat.tsv, sem tocar no
// gabarito. Nesse modo cobertura baixa é só informada (é a métrica do experimento).
const TAG = process.env.ALIGN_TAG || "";
const HEADER = ["translation", "book", "chapter", "verse", "position", "text", "strong"].join(String.fromCharCode(9));
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

// [USFM do arquivo, OSIS da coluna `book`] na ordem do NT (igual a fetch-nt.mjs)
const NT = [["MAT", "Matt"], ["MRK", "Mark"], ["LUK", "Luke"], ["JHN", "John"], ["ACT", "Acts"], ["ROM", "Rom"],
  ["1CO", "1Cor"], ["2CO", "2Cor"], ["GAL", "Gal"], ["EPH", "Eph"], ["PHP", "Phil"], ["COL", "Col"],
  ["1TH", "1Thess"], ["2TH", "2Thess"], ["1TI", "1Tim"], ["2TI", "2Tim"], ["TIT", "Titus"], ["PHM", "Phlm"],
  ["HEB", "Heb"], ["JAS", "Jas"], ["1PE", "1Pet"], ["2PE", "2Pet"], ["1JN", "1John"], ["2JN", "2John"],
  ["3JN", "3John"], ["JUD", "Jude"], ["REV", "Rev"]];

function check(ch, where = {
  input: `scripts/align/work/jhn-${pad(ch)}.input.json`,
  align: `scripts/align/work/jhn-${pad(ch)}.align${TAG ? "." + TAG : ""}.json`,
  osis: "John",
}) {
  const input = readJson(where.input);
  const align = readJson(where.align);
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
      rows.push(["por_blj", where.osis, ch, v.verse, i + 1, String(s.t ?? "").replace(/\t/g, " "), s.s ?? ""].join("\t"));
    });
    for (const g of v.greek) {
      if (!g.s || g.s === "G3588") continue;
      content++;
      if (used.has(g.s)) linked++;
    }
  }
  const coverage = content ? linked / content : 1;
  if (coverage < 0.85 && !TAG) errors.push(`cobertura ${(coverage * 100).toFixed(1)}% < 85%`);
  return { errors, rows, coverage };
}

const arg = process.argv[2];
if (arg === "nt") {
  if (!TAG) { console.error("O modo nt só roda com ALIGN_TAG=stat (a ligação do NT é estatística)."); process.exit(1); }
  const rows = [];
  let bad = 0;
  for (const [usfm, osis] of NT) {
    if (usfm === "JHN") continue; // João fica com o gabarito (tagged-john.tsv)
    const files = fs.readdirSync("scripts/align/work/nt").filter((f) => f.startsWith(usfm + "-") && f.endsWith(".json") && !f.includes(".align")).sort();
    const covs = [];
    for (const f of files) {
      const ch = Number(f.slice(usfm.length + 1, -5));
      const base = `scripts/align/work/nt/${usfm}-${pad(ch)}`;
      const r = check(ch, { input: base + ".json", align: `${base}.align.${TAG}.json`, osis });
      covs.push(r.coverage);
      rows.push(...r.rows);
      if (r.errors.length) { bad++; console.log(`${usfm} ${ch}: FALHOU`); r.errors.slice(0, 5).forEach((e) => console.log("  " + e)); }
    }
    const avg = covs.reduce((a, b) => a + b, 0) / covs.length;
    const low = covs.filter((c) => c < 0.85).length;
    console.log(`${usfm}: ${files.length} cap · cobertura grega média ${(avg * 100).toFixed(1)}% · ${low} cap < 85% (aviso)`);
  }
  if (bad) { console.log(`${bad} capítulo(s) com erro de formato`); process.exit(1); }
  const out = `scripts/align/work/tagged-nt-${TAG}.tsv`;
  fs.writeFileSync(out, [HEADER, ...rows].join(String.fromCharCode(10)) + String.fromCharCode(10));
  console.log(`TSV: ${out} (${rows.length} linhas)`);
  process.exit(0);
}
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
  fs.writeFileSync(`scripts/align/work/tagged-john${TAG ? "-" + TAG : ""}.tsv`, ["translation\tbook\tchapter\tverse\tposition\ttext\tstrong", ...all].join("\n") + "\n");
  console.log(`TSV: tagged-john${TAG ? "-" + TAG : ""}.tsv (${all.length} linhas)`);
}
