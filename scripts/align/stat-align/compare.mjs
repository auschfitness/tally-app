// Compara, palavra a palavra, o TSV do alinhador estatístico com o gabarito feito por IA.
// Uso: node scripts/align/stat-align/compare.mjs [gabarito.tsv] [stat.tsv]
import fs from "node:fs";

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const [goldFile, statFile] = [
  process.argv[2] ?? "scripts/align/work/tagged-john.tsv",
  process.argv[3] ?? "scripts/align/work/tagged-john-stat.tsv",
];

// verso "cap:verso" -> [{ w, s }]: tokeniza o texto do verso INTEIRO (um trecho pode cortar
// uma palavra ao meio) e cada palavra herda o Strong do trecho onde ela começa.
function words(file) {
  const verses = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(String.fromCharCode(10)).slice(1)) {
    if (!line) continue;
    const [, , ch, v, , text, strong] = line.split(String.fromCharCode(9));
    const e = verses.get(`${ch}:${v}`) ?? verses.set(`${ch}:${v}`, { text: "", marks: [] }).get(`${ch}:${v}`);
    e.marks.push([e.text.length, strong || null]);
    e.text += text;
  }
  const out = new Map();
  for (const [k, { text, marks }] of verses) {
    const strongAt = (i) => marks.findLast(([from]) => from <= i)?.[1] ?? null;
    out.set(k, [...text.matchAll(WORD)].map((m) => ({ w: m[0], s: strongAt(m.index) })));
  }
  return out;
}

const gold = words(goldFile), stat = words(statFile);
let n = 0, goldLinked = 0, same = 0, diff = 0, missed = 0, statLinked = 0, extra = 0;
const errors = [];
for (const [k, g] of gold) {
  const s = stat.get(k);
  if (!s || s.length !== g.length) throw new Error(`${k}: nº de palavras difere (${g.length} x ${s?.length})`);
  g.forEach((gw, i) => {
    n++;
    const sw = s[i];
    if (sw.s) statLinked++;
    if (gw.s) {
      goldLinked++;
      if (sw.s === gw.s) same++;
      else if (sw.s) { diff++; errors.push({ k, ctx: g.slice(Math.max(0, i - 3), i + 3).map((x) => x.w).join(" "), w: gw.w, gold: gw.s, stat: sw.s }); }
      else missed++;
    } else if (sw.s) extra++;
  });
}
const pct = (a, b) => ((100 * a) / b).toFixed(1) + "%";
console.log(`palavras PT: ${n} · com Strong no gabarito: ${goldLinked} · com Strong no estatístico: ${statLinked}`);
console.log(`concordância (gabarito ligado): ${pct(same, goldLinked)} (${same}) · outro Strong: ${pct(diff, goldLinked)} (${diff}) · sem Strong: ${pct(missed, goldLinked)} (${missed})`);
console.log(`precisão quando os dois ligam: ${pct(same, same + diff)} · cobertura (palavras do gabarito ligadas): ${pct(same + diff, goldLinked)} · ligadas só no estatístico: ${extra}`);
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
console.log("10 erros (outro Strong), sorteados:");
for (let i = 0; i < 10 && errors.length; i++) {
  const [e] = errors.splice(Math.floor(rnd() * errors.length), 1);
  console.log(`  ${e.k} "${e.w}" em "${e.ctx}": gabarito ${e.gold} · estatístico ${e.stat}`);
}
