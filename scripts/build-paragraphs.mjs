// Gera src/lib/bible/paragraphs.json: em que versículo começa cada parágrafo, por livro e
// capítulo. A Bíblia Livre não marca parágrafo (só um \p por capítulo), então a divisão vem
// da World English Bible (domínio público), que usa a mesma numeração de versículos.
// Só a estrutura é aproveitada; o texto continua sendo o da Bíblia Livre.
//
// Uso: baixe e descompacte https://ebible.org/Scriptures/engwebp_usfm.zip e rode
//   node scripts/build-paragraphs.mjs <pasta-dos-usfm>
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Uso: node scripts/build-paragraphs.mjs <pasta-dos-usfm>");
  process.exit(1);
}

// Marcadores que abrem bloco novo. Linhas de poesia (\q) ficam de fora: quebrariam quase
// todo versículo dos Salmos; o que separa estrofes é o \b.
const BREAK = /^\\(p|m|pi\d?|pmo|b|s\d?)(\s|$)/;
const out = {};

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".usfm")).sort()) {
  const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
  const book = /^\\id (\w{3})/.exec(lines[0] ?? "")?.[1];
  if (!book || book === "FRT" || book === "GLO") continue;
  let chapter = 0;
  let pending = false;
  for (const line of lines) {
    const c = /^\\c (\d+)/.exec(line);
    if (c) {
      chapter = Number(c[1]);
      pending = false; // o 1º versículo do capítulo sempre abre parágrafo; não precisa guardar
      continue;
    }
    if (BREAK.test(line)) pending = true;
    for (const v of line.matchAll(/\\v (\d+)/g)) {
      const n = Number(v[1]);
      if (pending && n > 1) ((out[book] ??= {})[chapter] ??= []).push(n);
      pending = false;
    }
  }
}

const target = path.join(import.meta.dirname, "../src/lib/bible/paragraphs.json");
fs.writeFileSync(target, JSON.stringify(out) + "\n");
console.log(`${Object.keys(out).length} livros → ${target}`);
