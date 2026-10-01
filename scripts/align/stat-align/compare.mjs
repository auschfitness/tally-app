// Compara, palavra a palavra, o TSV do alinhador estatístico com o gabarito feito por IA.
// Uso: node scripts/align/stat-align/compare.mjs [--chapters 11-21] [--gold g.tsv] [--stat s.tsv]
//   precisão = das palavras que o estatístico liga, quantas têm o MESMO Strong do gabarito
//              (estrita: palavra que o gabarito deixou sem Strong conta como erro;
//               "nas do gabarito": só entram as palavras que o gabarito também liga)
//   cobertura = das palavras ligadas no gabarito, quantas o estatístico liga (a qualquer Strong)
//   concordância = das palavras ligadas no gabarito, quantas receberam o mesmo Strong
import fs from "node:fs";

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const NL = String.fromCharCode(10), TAB = String.fromCharCode(9);
const flag = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const goldFile = flag("gold", "scripts/align/work/tagged-john.tsv");
const statFile = flag("stat", "scripts/align/work/tagged-john-stat.tsv");
const [c0, c1] = flag("chapters", "1-21").split("-").map(Number);

// verso "cap:verso" -> [{ w, s }]: tokeniza o texto do verso INTEIRO (um trecho pode cortar
// uma palavra ao meio) e cada palavra herda o Strong do trecho onde ela começa.
function words(file) {
  const verses = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(NL).slice(1)) {
    if (!line) continue;
    const [, , ch, v, , text, strong] = line.split(TAB);
    if (+ch < c0 || +ch > c1) continue;
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
console.log(`capítulos ${c0}-${c1} · palavras PT: ${n} · ligadas no gabarito: ${goldLinked} · ligadas no estatístico: ${statLinked}`);
console.log(`precisão estrita: ${pct(same, statLinked)} · precisão nas do gabarito: ${pct(same, same + diff)} · cobertura: ${pct(same + diff, goldLinked)} · concordância: ${pct(same, goldLinked)}`);
console.log(`outro Strong: ${diff} · sem Strong (perdidas): ${missed} · ligadas só no estatístico: ${extra}`);
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
console.log("10 erros (outro Strong), sorteados:");
for (let i = 0; i < 10 && errors.length; i++) {
  const [e] = errors.splice(Math.floor(rnd() * errors.length), 1);
  console.log(`  ${e.k} "${e.w}" em "${e.ctx}": gabarito ${e.gold} · estatístico ${e.stat}`);
}
