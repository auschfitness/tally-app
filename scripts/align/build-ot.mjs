// Monta AT completo, preservando gabaritos; nunca grava dados no banco.
// Só emite o TSV de carga quando todos os capítulos estiverem processados e a cobertura >=95%.
import fs from "node:fs";
import { checkVerse, compareSpans, wordMarks, fillOnlyGaps } from "./alignment-quality.mjs";

const ROOT = "scripts/align/work";
const OSIS = Object.fromEntries("GEN:Gen EXO:Exod LEV:Lev NUM:Num DEU:Deut JOS:Josh JDG:Judg RUT:Ruth 1SA:1Sam 2SA:2Sam 1KI:1Kgs 2KI:2Kgs 1CH:1Chr 2CH:2Chr EZR:Ezra NEH:Neh EST:Esth JOB:Job PSA:Ps PRO:Prov ECC:Eccl SNG:Song ISA:Isa JER:Jer LAM:Lam EZK:Ezek DAN:Dan HOS:Hos JOL:Joel AMO:Amos OBA:Obad JON:Jonah MIC:Mic NAM:Nah HAB:Hab ZEP:Zeph HAG:Hag ZEC:Zech MAL:Mal".split(" ").map((s) => s.split(":")));
const rows = ["translation\tbook\tchapter\tverse\tposition\ttext\tstrong"];
const report = { chapters: 0, missingChapters: [], rejectedChapters: [], verses: 0, gemVerses: 0, goldVerses: 0, fallbackVerses: 0, words: 0, linkedWords: 0, sameBaseline: 0, bothBaseline: 0, errors: [] };
for (const file of fs.readdirSync(`${ROOT}/ot`).filter((f) => /^[1-3A-Z]{3}-\d+\.json$/.test(f)).sort()) {
  const name = file.slice(0, -5), [book, ch] = name.split("-");
  const source = JSON.parse(fs.readFileSync(`${ROOT}/ot/${file}`, "utf8"));
  const goldPath = `${ROOT}/ot/${name}.gold.json`, gemPath = `${ROOT}/gem-ot/${name}.align.json`;
  const gold = fs.existsSync(goldPath);
  if (!gold && !fs.existsSync(gemPath)) { report.missingChapters.push(name); continue; }
  const chosen = new Map(JSON.parse(fs.readFileSync(gold ? goldPath : gemPath, "utf8")).map((v) => [v.verse, v]));
  const stat = new Map(JSON.parse(fs.readFileSync(`${ROOT}/ot/${name}.align.stat.json`, "utf8")).map((v) => [v.verse, v]));
  let chapterSame = 0, chapterBoth = 0;
  report.chapters++;
  for (const v of source.verses) {
    let result = chosen.get(v.verse);
    const fallback = !result || result.failed;
    if (fallback) { result = stat.get(v.verse); report.fallbackVerses++; }
    else if (gold) report.goldVerses++; else report.gemVerses++;
    if (!result) { report.errors.push(`${name}:${v.verse}: sem ligação`); continue; }
    // Gabarito e fallback podem ter omissões; só saídas Gemini exigem cobertura integral.
    if (!gold && !fallback) {
      const why = checkVerse(v, result);
      if (why) report.errors.push(`${name}:${v.verse}: ${why}`);
    }
    const allowed = new Set(v.greek.map((g) => g.s).filter(Boolean));
    if (result.spans.map((s) => s.t).join("") !== v.pt) report.errors.push(`${name}:${v.verse}: texto alterado`);
    if (result.spans.some((s) => !s.t || (s.s && !allowed.has(s.s)))) report.errors.push(`${name}:${v.verse}: trecho inválido`);
    const score = compareSpans(result.spans, stat.get(v.verse).spans);
    if (!gold && !fallback) { chapterSame += score.same; chapterBoth += score.both; report.sameBaseline += score.same; report.bothBaseline += score.both; }
    if (!gold && !fallback) result = { ...result, spans: fillOnlyGaps(result.spans, stat.get(v.verse).spans) };
    if (result.spans.map((s) => s.t).join("") !== v.pt || result.spans.some((s) => s.s && !allowed.has(s.s))) report.errors.push(`${name}:${v.verse}: ligação final inválida`);
    const tags = wordMarks(result.spans);
    report.words += tags.length; report.linkedWords += tags.filter((t) => t.strong).length;
    report.verses++;
    result.spans.forEach((s, i) => {
      if (/[\t\r\n]/.test(s.t)) report.errors.push(`${name}:${v.verse}: separador TSV no texto`);
      rows.push(["por_blj", OSIS[book], Number(ch), v.verse, i + 1, s.t, s.s || ""].join("\t"));
    });
  }
  if (!gold && chapterBoth && chapterSame / chapterBoth < 0.85) report.rejectedChapters.push(name);
}
report.coverage = report.words ? +(report.linkedWords / report.words * 100).toFixed(2) : 0;
report.agreement = report.bothBaseline ? +(report.sameBaseline / report.bothBaseline * 100).toFixed(2) : null;
report.ready = report.chapters === 929 && !report.missingChapters.length && !report.rejectedChapters.length && !report.errors.length && report.coverage >= 95;
fs.mkdirSync(`${ROOT}/gem-ot`, { recursive: true });
fs.writeFileSync(`${ROOT}/gem-ot/build-status.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, missingChapters: report.missingChapters.length,
  missingSample: report.missingChapters.slice(0, 10), rejectedChapters: report.rejectedChapters,
  errors: report.errors.slice(0, 20) }, null, 2));
if (report.ready) {
  fs.writeFileSync(`${ROOT}/tagged-ot-complete.tsv`, rows.join("\n") + "\n");
  console.log("TSV pronto: tagged-ot-complete.tsv");
} else process.exitCode = 1;
