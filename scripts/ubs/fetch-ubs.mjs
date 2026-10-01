// Dicionário Grego do NT da UBS (Louw-Nida revisado, CC BY-SA 4.0), versão espanhola.
// Gera em scripts/ubs/work/: senses.json (todos os sentidos, já no formato do banco, sem
// a tradução), domains.input.json (rótulos de domínio) e ubs-NN.input.json (lotes do que
// precisa ser traduzido). Lotes do piloto (João + Efésios 4) vêm primeiro.
// Uso: node scripts/ubs/fetch-ubs.mjs
import fs from "node:fs";

const SRC = "https://raw.githubusercontent.com/ubsicap/ubs-open-license/main/dictionaries/greek/JSON/UBSGreekNTDic-v1.0-es.JSON";
const DIR = "scripts/ubs/work";
const BATCH_CHARS = 30000;

const raw = `${DIR}/ubs-es.json`;
if (!fs.existsSync(raw)) fs.writeFileSync(raw, await (await fetch(SRC)).text());
const dict = JSON.parse(fs.readFileSync(raw, "utf8").replace(/^\uFEFF/, ""));

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const pilot = (refs) => refs.some((r) => r.startsWith("043") || r.startsWith("049004"));
const senses = [];
const domains = new Map();
for (const e of dict) {
  const strongs = (e.StrongCodes ?? []).filter((s) => /^G\d+$/.test(s));
  if (!strongs.length) continue;
  let ord = 0;
  for (const b of e.BaseForms ?? []) {
    for (const m of b.LEXMeanings ?? []) {
      const s = (m.LEXSenses ?? []).find((x) => x.LanguageCode === "es");
      if (!s) continue;
      for (const d of [...(m.LEXDomains ?? []), ...(m.LEXSubDomains ?? [])]) domains.set(d.DomainCode, clean(d.Domain));
      senses.push({
        id: m.LEXID,
        strongs,
        lemma: e.Lemma,
        entry_code: m.LEXEntryCode ?? null,
        ord: ord++,
        domains: (m.LEXDomains ?? []).map((d) => d.DomainCode),
        subdomains: (m.LEXSubDomains ?? []).map((d) => d.DomainCode),
        // BBBCCCVVV: livro (040 = Mt), capítulo, versículo. A palavra (últimos 5) não entra.
        refs: [...new Set((m.LEXReferences ?? []).map((r) => r.slice(0, 9)))],
        es: { glosses: (s.Glosses ?? []).map(clean).filter(Boolean), short: clean(s.DefinitionShort || s.DefinitionLong), comments: clean(s.Comments) },
      });
    }
  }
}
fs.writeFileSync(`${DIR}/senses.json`, JSON.stringify(senses));
fs.writeFileSync(`${DIR}/domains.input.json`, JSON.stringify([...domains].map(([code, es]) => ({ code, es })), null, 1));

const order = [...senses.filter((s) => pilot(s.refs)), ...senses.filter((s) => !pilot(s.refs))];
const size = (s) => s.es.glosses.join(", ").length + s.es.short.length + s.es.comments.length;
const batches = [];
let cur = [], chars = 0, pilotBatches = 0;
for (const s of order) {
  if (cur.length && (chars + size(s) > BATCH_CHARS || pilot(cur[0].refs) !== pilot(s.refs))) {
    batches.push(cur);
    cur = [];
    chars = 0;
  }
  cur.push(s);
  chars += size(s);
}
if (cur.length) batches.push(cur);
for (const f of fs.readdirSync(DIR).filter((f) => /^ubs-\d+\.input\.json$/.test(f))) fs.unlinkSync(`${DIR}/${f}`);
batches.forEach((b, i) => {
  if (pilot(b[0].refs)) pilotBatches++;
  fs.writeFileSync(`${DIR}/ubs-${String(i + 1).padStart(2, "0")}.input.json`, JSON.stringify(b.map((s) => ({ id: s.id, ...s.es })), null, 1));
});
console.log(`${senses.length} sentidos, ${domains.size} domínios, ${batches.length} lotes (piloto: 1-${pilotBatches})`);
