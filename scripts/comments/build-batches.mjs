// Monta os lotes de tradução dos comentários de João (Frente C, spec 09).
// Uso: node scripts/comments/build-batches.mjs        (rode depois de fetch.mjs)
// Saída: scripts/comments/work/batch-NN.input.json = [{ id, source, chapter, verse, kind, text }]
// Cada bloco fica inteiro num lote; lote fecha perto de 40 mil caracteres. Ordem: JFB inteiro, depois Tyndale.
import fs from "node:fs";
import path from "node:path";

const WORK = path.join("scripts", "comments", "work");
const SOURCES = ["jamieson-fausset-brown", "tyndale"];
const SHORT = { "jamieson-fausset-brown": "jfb", tyndale: "tyn" };
const LIMIT = 40000;
const pad = (n) => String(n).padStart(2, "0");

const items = [];
for (const source of SOURCES) {
  for (let ch = 1; ch <= 21; ch++) {
    const file = path.join(WORK, source, `JHN-${ch}.json`);
    const { blocks } = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const b of blocks) {
      items.push({ id: `${SHORT[source]}-${ch}-${b.kind === "intro" ? "i" : b.verse}`, source: SHORT[source], chapter: ch, verse: b.verse, kind: b.kind, text: b.text });
    }
  }
}
const ids = new Set(items.map((i) => i.id));
if (ids.size !== items.length) throw new Error("ids repetidos");

for (const f of fs.readdirSync(WORK)) if (/^batch-\d+\.input\.json$/.test(f)) fs.unlinkSync(path.join(WORK, f));

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
  if (batch.length && (size + it.text.length > LIMIT || batch[0].source !== it.source)) flush();
  batch.push(it); size += it.text.length;
}
flush();
console.log(`${items.length} blocos em ${n} lotes`);
