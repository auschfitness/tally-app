// Monta os lotes de tradução dos comentários (Frente C, spec 09).
// Uso: node scripts/comments/build-batches.mjs [LIVRO...]   (rode depois de fetch.mjs; padrão JHN)
//      COMMENTS_LIMIT=15000 encolhe os lotes (o Gemini traduz melhor em lotes menores).
// Id: João mantém "jfb-1-3" (já carregado); outros livros levam o livro na frente ("rom-jfb-1-3").
// Saída: scripts/comments/work/batch-NN.input.json = [{ id, source, chapter, verse, kind, text }]
// Cada bloco fica inteiro num lote; lote fecha perto de 40 mil caracteres. Ordem: JFB inteiro, depois Tyndale.
import fs from "node:fs";
import path from "node:path";

const WORK = path.join("scripts", "comments", "work");
const SOURCES = ["jamieson-fausset-brown", "tyndale"];
const SHORT = { "jamieson-fausset-brown": "jfb", tyndale: "tyn" };
const LIMIT = Number(process.env.COMMENTS_LIMIT) || 40000;
const BOOKS = process.argv.slice(2).length ? process.argv.slice(2) : ["JHN"];
const pad = (n) => String(n).padStart(2, "0");

const items = [];
for (const book of BOOKS) {
  const pre = book === "JHN" ? "" : `${book.toLowerCase()}-`;
  for (const source of SOURCES) {
    for (let ch = 1; fs.existsSync(path.join(WORK, source, `${book}-${ch}.json`)); ch++) {
      const { blocks } = JSON.parse(fs.readFileSync(path.join(WORK, source, `${book}-${ch}.json`), "utf8"));
      for (const b of blocks) {
        items.push({ id: `${pre}${SHORT[source]}-${ch}-${b.kind === "intro" ? "i" : b.verse}`, book, source: SHORT[source], chapter: ch, verse: b.verse, kind: b.kind, text: b.text });
      }
    }
  }
}
const ids = new Set(items.map((i) => i.id));
if (ids.size !== items.length) throw new Error("ids repetidos");

for (const f of fs.readdirSync(WORK)) if (/^batch-\d+\.(input|pt)\.json$/.test(f)) fs.unlinkSync(path.join(WORK, f));

let batch = [], size = 0, n = 0;
const flush = () => {
  if (!batch.length) return;
  n++;
  fs.writeFileSync(path.join(WORK, `batch-${pad(n)}.input.json`), JSON.stringify(batch, null, 1));
  console.log(`batch-${pad(n)}: ${batch.length} blocos, ${size} caracteres (${batch[0].id} .. ${batch[batch.length - 1].id})`);
  batch = []; size = 0;
};
for (const it of items) {
  // fecha o lote antes de estourar, mas nunca deixa a troca de fonte no meio de um lote
  if (batch.length && (size + it.text.length > LIMIT || batch[0].source !== it.source || batch[0].book !== it.book)) flush();
  batch.push(it); size += it.text.length;
}
flush();
console.log(`${items.length} blocos em ${n} lotes`);
