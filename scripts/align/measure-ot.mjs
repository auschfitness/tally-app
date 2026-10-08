// Qualidade nos capítulos com gabarito, sem alterar dados.
import fs from "node:fs";
import { checkVerse, compareSpans, indexedWords } from "./alignment-quality.mjs";

const root = "scripts/align/work";
const outDir = process.argv[2] || process.env.ALIGN_PILOT_DIR || `${root}/gem-ot-word-pilot`;
const heldOut = ["GEN-22", "RUT-01", "PSA-51", "PRO-03", "JER-31", "2KI-05"];
const expected = heldOut.flatMap((name) => JSON.parse(fs.readFileSync(`${root}/ot/${name}.json`, "utf8")).verses);
const expectedWords = expected.reduce((n, v) => n + indexedWords(v.pt).length, 0);
let same = 0, both = 0, words = 0, linked = 0, checked = 0, failed = 0;
const chapters = [];
for (const file of fs.readdirSync(`${root}/ot`).filter((f) => f.endsWith(".gold.json"))) {
  const name = file.slice(0, -10);
  const gemFile = `${outDir}/${name}.align.json`;
  if (!fs.existsSync(gemFile)) continue;
  const source = JSON.parse(fs.readFileSync(`${root}/ot/${name}.json`, "utf8"));
  const gold = new Map(JSON.parse(fs.readFileSync(`${root}/ot/${file}`, "utf8")).map((v) => [v.verse, v.spans]));
  const gem = new Map(JSON.parse(fs.readFileSync(gemFile, "utf8")).map((v) => [v.verse, v]));
  let n = 0, equal = 0;
  for (const verse of source.verses) {
    const result = gem.get(verse.verse);
    if (!result || result.failed) { failed++; continue; }
    const why = checkVerse(verse, result);
    if (why) throw new Error(`${name}:${verse.verse}: ${why}`);
    const score = compareSpans(result.spans, gold.get(verse.verse));
    same += score.same; equal += score.same; both += score.both; n += score.both;
    words += score.words; linked += score.linked; checked++;
  }
  chapters.push({ chapter: name, agreement: n ? +(equal / n * 100).toFixed(2) : null });
}
const report = { chapters, checkedVerses: checked, failedVerses: failed, linkedWords: linked, words,
  agreement: both ? +(same / both * 100).toFixed(2) : null, coverage: words ? +(linked / words * 100).toFixed(2) : null,
  complete: heldOut.every((name) => chapters.some((ch) => ch.chapter === name)) && checked === expected.length && failed === 0 && words === expectedWords && linked === expectedWords };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/pilot-quality.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.complete || (report.agreement ?? 0) < 94) process.exitCode = 1;
