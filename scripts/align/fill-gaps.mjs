// Frente B da spec 09: toda palavra do texto ligada a uma palavra grega (sublinhado
// completo no Interlinear), sem IA. Preenche as lacunas que o alinhador estatístico deixou.
// Para cada lacuna há três estratégias:
//   next  = gruda na próxima palavra ligada da mesma oração ("do chamado" → chamado);
//   prev  = gruda na anterior;
//   table = o Strong DO VERSÍCULO mais associado à palavra nas ligações que já existem.
// Qual usar é APRENDIDO palavra por palavra do gabarito de João (alinhado por IA): o
// gabarito agrupa a palavra pequena com a de conteúdo, então "acertar" é seguir esse jeito.
// Palavra nunca vista usa a estratégia que mais acerta no geral.
// Uso (de scripts/align): node fill-gaps.mjs eval   → aprende em João 1-10, mede em 11-21
//                         node fill-gaps.mjs write  → aprende em João inteiro e grava
//                          work/tagged-nt-filled.tsv e work/tagged-john-filled.tsv
import fs from "node:fs";

const W = "work";
const TAB = String.fromCharCode(9);
const NT = [["MAT", "Matt"], ["MRK", "Mark"], ["LUK", "Luke"], ["JHN", "John"], ["ACT", "Acts"], ["ROM", "Rom"],
  ["1CO", "1Cor"], ["2CO", "2Cor"], ["GAL", "Gal"], ["EPH", "Eph"], ["PHP", "Phil"], ["COL", "Col"],
  ["1TH", "1Thess"], ["2TH", "2Thess"], ["1TI", "1Tim"], ["2TI", "2Tim"], ["TIT", "Titus"], ["PHM", "Phlm"],
  ["HEB", "Heb"], ["JAS", "Jas"], ["1PE", "1Pet"], ["2PE", "2Pet"], ["1JN", "1John"], ["2JN", "2John"],
  ["3JN", "3John"], ["JUD", "Jude"], ["REV", "Rev"]];
const USFM = Object.fromEntries(NT.map(([u, o]) => [o, u]));
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const HAS_WORD = /[\p{L}\p{N}]/u;
const CLAUSE_END = /[.;:!?]\s*$/;
const STRATS = ["next", "prev", "table"];
const MIN_SEEN = 3;

const pad = (n) => String(n).padStart(2, "0");
const key = (b, c, v) => `${b}|${c}|${v}`;

function readTsv(file) {
  const verses = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const [translation, book, chapter, verse, position, text, strong] = line.split(TAB);
    const k = key(book, chapter, verse);
    if (!verses.has(k)) verses.set(k, []);
    verses.get(k).push({ translation, book, chapter, verse, position, text, strong: strong || "" });
  }
  return verses;
}
function writeTsv(file, verses) {
  const rows = [["translation", "book", "chapter", "verse", "position", "text", "strong"].join(TAB)];
  for (const list of verses.values()) for (const r of list) rows.push([r.translation, r.book, r.chapter, r.verse, r.position, r.text, r.strong].join(TAB));
  fs.writeFileSync(file, rows.join("\n") + "\n");
}

const greekCache = new Map();
function greekOf(book, chapter, verse) {
  const usfm = USFM[book];
  const file = usfm === "JHN" ? `${W}/jhn-${pad(chapter)}.input.json` : `${W}/nt/${usfm}-${pad(chapter)}.json`;
  if (!greekCache.has(file)) {
    const d = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { verses: [] };
    greekCache.set(file, new Map(d.verses.map((v) => [String(v.verse), [...new Set(v.greek.map((g) => g.s).filter(Boolean))]])));
  }
  return greekCache.get(file).get(String(verse)) ?? [];
}

const firstWord = (text) => (text.toLowerCase().match(WORD) ?? [])[0] ?? "";

function learnTable(table, verses) {
  for (const list of verses.values())
    for (const r of list) {
      if (!r.strong) continue;
      for (const w of r.text.toLowerCase().match(WORD) ?? []) {
        const t = (table[w] ??= { n: 0, by: {} });
        t.n++;
        t.by[r.strong] = (t.by[r.strong] ?? 0) + 1;
      }
    }
  return table;
}

// O Strong que cada estratégia daria para a lacuna i (ou "" se não der nada).
function proposals(list, i, greek, table) {
  let next = "", prev = "", tbl = "";
  for (let j = i + 1; j < list.length; j++) {
    if (CLAUSE_END.test(list[j - 1].text)) break;
    if (list[j].strong) {
      next = list[j].strong;
      break;
    }
  }
  for (let j = i - 1; j >= 0; j--) {
    if (CLAUSE_END.test(list[j].text)) break;
    if (list[j].strong) {
      prev = list[j].strong;
      break;
    }
  }
  const t = table[firstWord(list[i].text)];
  if (t && t.n >= MIN_SEEN) {
    let score = 0;
    for (const s of greek) {
      const sc = (t.by[s] ?? 0) / t.n;
      if (sc > score) [tbl, score] = [s, sc];
    }
  }
  return { next, prev, table: tbl };
}

// Palavra (pelo início no texto do versículo) → Strong do trecho onde ela está.
function wordMap(list) {
  const m = new Map();
  let at = 0;
  for (const r of list) {
    for (const x of r.text.matchAll(WORD)) m.set(at + x.index, r.strong);
    at += r.text.length;
  }
  return m;
}
function spanStarts(list) {
  const starts = [];
  let at = 0;
  for (const r of list) {
    const m = r.text.match(/[\p{L}\p{N}]/u);
    starts.push(m ? at + (m.index ?? 0) : -1);
    at += r.text.length;
  }
  return starts;
}

// Aprende, para cada palavra, quantas vezes cada estratégia acertou o gabarito.
function learnStrategy(stat, gold, table, keep) {
  const per = {}, all = Object.fromEntries(STRATS.map((s) => [s, 0]));
  for (const [k, list] of stat) {
    const g = gold.get(k);
    if (!g || !keep(k)) continue;
    const [book, ch, v] = k.split("|");
    const greek = greekOf(book, ch, v), gm = wordMap(g), starts = spanStarts(list);
    list.forEach((r, i) => {
      if (r.strong || !HAS_WORD.test(r.text)) return;
      const want = gm.get(starts[i]);
      if (!want) return;
      const p = proposals(list, i, greek, table);
      const w = firstWord(r.text);
      for (const s of STRATS)
        if (p[s] === want) {
          (per[w] ??= Object.fromEntries(STRATS.map((x) => [x, 0])))[s]++;
          all[s]++;
        }
    });
  }
  const best = (c) => STRATS.reduce((a, b) => (c[b] > c[a] ? b : a));
  const choice = Object.fromEntries(Object.entries(per).map(([w, c]) => [w, best(c)]));
  return { choice, fallback: best(all) };
}

// Duas passadas: primeiro as palavras cuja estratégia é a tabela (palavras de conteúdo,
// que têm par próprio no grego); depois as que grudam na vizinha, olhando o texto JÁ
// preenchido ("a videira": videira acha o seu Strong e o "a" gruda nela).
function fillVerse(list, greek, table, strat) {
  const out = list.map((r) => ({ ...r }));
  const kinds = list.map(() => "");
  const gap = (r) => !r.strong && HAS_WORD.test(r.text);
  const wantOf = (r) => strat.choice[firstWord(r.text)] ?? strat.fallback;
  out.forEach((r, i) => {
    if (!gap(r) || wantOf(r) !== "table") return;
    const t = proposals(out, i, greek, table).table;
    if (t) [r.strong, kinds[i]] = [t, "table"];
  });
  out.forEach((r, i) => {
    if (!gap(r)) return;
    const p = proposals(out, i, greek, table);
    const want = wantOf(r);
    const s = [want, ...STRATS.filter((x) => x !== want)].find((x) => p[x]);
    if (s) [r.strong, kinds[i]] = [p[s], s];
  });
  return { out, kinds };
}

const mode = process.argv[2];
if (mode === "eval") {
  const gold = readTsv(`${W}/tagged-john.tsv`);
  const stat = readTsv(`${W}/tagged-john-stat.tsv`);
  const table = learnTable(learnTable({}, readTsv(`${W}/tagged-nt-stat.tsv`)), stat);
  const ch = (k) => Number(k.split("|")[1]);
  const strat = learnStrategy(stat, gold, table, (k) => ch(k) <= 10);
  let words = 0, before = 0, after = 0, judged = 0, ok = 0;
  const byKind = {};
  for (const [k, list] of stat) {
    const g = gold.get(k);
    if (!g || ch(k) <= 10) continue;
    const [book, c, v] = k.split("|");
    const { out, kinds } = fillVerse(list, greekOf(book, c, v), table, strat);
    const gm = wordMap(g), starts = spanStarts(list);
    for (const s of wordMap(list).values()) { words++; if (s) before++; }
    for (const s of wordMap(out).values()) if (s) after++;
    out.forEach((r, i) => {
      if (!kinds[i]) return;
      const want = gm.get(starts[i]);
      const b = (byKind[kinds[i]] ??= { n: 0, judged: 0, ok: 0 });
      b.n++;
      if (!want) return;
      judged++;
      b.judged++;
      if (want === r.strong) {
        ok++;
        b.ok++;
      }
    });
  }
  const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "-");
  console.log(`Aprendido em João 1-10, medido em João 11-21 (estratégia padrão: ${strat.fallback}):`);
  console.log(`  palavras ligadas: ${pct(before, words)} → ${pct(after, words)} (${words} palavras)`);
  console.log(`  preenchidas com resposta no gabarito: ${judged}; acerto: ${pct(ok, judged)}`);
  for (const [k, v] of Object.entries(byKind)) console.log(`    ${k}: ${v.n} (acerto ${pct(v.ok, v.judged)} de ${v.judged})`);
} else if (mode === "write") {
  const gold = readTsv(`${W}/tagged-john.tsv`);
  const stat = readTsv(`${W}/tagged-john-stat.tsv`);
  const nt = readTsv(`${W}/tagged-nt-stat.tsv`);
  const table = learnTable(learnTable({}, nt), gold);
  const strat = learnStrategy(stat, gold, table, () => true);
  for (const [name, verses, file] of [["NT", nt, "tagged-nt-filled.tsv"], ["João", gold, "tagged-john-filled.tsv"]]) {
    let words = 0, before = 0, after = 0;
    const out = new Map();
    for (const [k, list] of verses) {
      const [book, c, v] = k.split("|");
      const filled = fillVerse(list, greekOf(book, c, v), table, strat).out;
      out.set(k, filled);
      for (const s of wordMap(list).values()) { words++; if (s) before++; }
      for (const s of wordMap(filled).values()) if (s) after++;
    }
    writeTsv(`${W}/${file}`, out);
    console.log(`${name}: ligadas ${((100 * before) / words).toFixed(1)}% → ${((100 * after) / words).toFixed(1)}% → ${W}/${file}`);
  }
} else {
  console.error("Uso: node fill-gaps.mjs <eval|write>");
  process.exit(1);
}
