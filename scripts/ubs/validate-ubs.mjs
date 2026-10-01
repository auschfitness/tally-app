// Confere lotes traduzidos do dicionário UBS (ES → PT) e pega "tradução" feita por script:
// sobra de espanhol, texto quase idêntico ao original, item faltando ou cortado.
// Uso: node scripts/ubs/validate-ubs.mjs 3   |   node scripts/ubs/validate-ubs.mjs 1-16
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const DIR = "scripts/ubs/work";
const pad = (n) => String(n).padStart(2, "0");
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
// Palavras/terminações que só existem em espanhol. "\p{L}" no lugar de \b por causa do acento.
const ES = /ñ|ción|ciones|(?<![\p{L}-])(el|los|las|del|al|y|según|pero|muy|cuando|también|hay|puede|pueden|hacer|así|ello|esto|estos|su|sus)(?!\p{L})/giu;
// Marcações ({S:…}, {L:…}, {D:…}) e grego são iguais nos dois idiomas: fora da conta.
const words = (s) => new Set(clean(s).replace(/\{[^}]*\}/g, " ").toLowerCase().match(/[a-zà-ÿ]+/gu) ?? []);
function overlap(a, b) {
  const A = words(a), B = words(b);
  if (A.size < 15) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / A.size;
}

export function checkBatch(input, out) {
  const errors = [];
  if (!Array.isArray(out)) return ["a saída precisa ser um array"];
  if (out.length !== input.length) errors.push(`itens: ${out.length} ≠ ${input.length}`);
  input.forEach((e, i) => {
    const o = out[i];
    if (!o || o.id !== e.id) return errors.push(`#${i}: esperado id ${e.id}`);
    if (!Array.isArray(o.glosses_pt) || (e.glosses.length && !o.glosses_pt.some((g) => clean(g)))) errors.push(`${e.id}: glosses_pt vazio`);
    for (const [k, src] of [["short_pt", e.short], ["comments_pt", e.comments]]) {
      const pt = clean(o[k]);
      if (clean(src) && !pt) { errors.push(`${e.id}: ${k} vazio`); continue; }
      if (!pt) continue;
      const ratio = pt.length / clean(src).length;
      if (clean(src).length > 80 && (ratio < 0.7 || ratio > 1.4)) errors.push(`${e.id}: ${k} com tamanho estranho (${ratio.toFixed(2)}× o original)`);
      const es = pt.match(ES) ?? [];
      if (es.length) errors.push(`${e.id}: ${k} com espanhol (${[...new Set(es)].slice(0, 4).join(", ")})`);
      if (overlap(pt, src) > 0.75) errors.push(`${e.id}: ${k} quase igual ao espanhol`);
    }
    const g = (o.glosses_pt ?? []).join(" ");
    const ges = g.match(ES) ?? [];
    if (ges.length) errors.push(`${e.id}: glosses_pt com espanhol (${ges.join(", ")})`);
  });
  return errors;
}

// Só roda a linha de comando quando chamado direto (seed-ubs.mjs importa checkBatch).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2] ?? "";
  const [a, b] = arg.split("-").map(Number);
  if (!Number.isInteger(a)) {
    console.error("Uso: node scripts/ubs/validate-ubs.mjs <N|A-B>");
    process.exit(1);
  }
  let failed = false;
  for (let n = a; n <= (b || a); n++) {
    const inFile = `${DIR}/ubs-${pad(n)}.input.json`, outFile = `${DIR}/ubs-${pad(n)}.pt.json`;
    let errors;
    if (!fs.existsSync(outFile)) errors = ["saída ausente"];
    else {
      try {
        errors = checkBatch(JSON.parse(fs.readFileSync(inFile, "utf8")), JSON.parse(fs.readFileSync(outFile, "utf8")));
      } catch (e) {
        errors = [`JSON inválido: ${e.message}`];
      }
    }
    console.log(`lote ${n}: ${errors.length ? `FALHOU (${errors.length})` : "ok"}`);
    for (const x of errors.slice(0, 12)) console.log("  " + x);
    failed ||= errors.length > 0;
  }
  if (failed) process.exit(1);
}
