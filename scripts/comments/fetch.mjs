// Baixa comentários da API helloao e grava um JSON enxuto por capítulo.
// Uso: node scripts/comments/fetch.mjs                 (só João, como na Frente C)
//      node scripts/comments/fetch.mjs ROM 1CO         (livros escolhidos, código USFM)
//      node scripts/comments/fetch.mjs nt | ot         (Novo ou Antigo Testamento inteiro)
// Saída: scripts/comments/work/<fonte>/<LIVRO>-<cap>.json  (pasta ignorada pelo git)
// Formato: { source, chapter, blocks: [{ verse, kind: "intro"|"verse", text }] }
//   "intro" = texto que a API devolve como introdução do capítulo (no JFB cobre João 1.1 em diante).
import fs from "node:fs";
import path from "node:path";

const SOURCES = ["jamieson-fausset-brown", "tyndale"];
const OUT = path.join("scripts", "comments", "work");

function clean(parts) {
  return parts
    .filter((p) => typeof p === "string")
    .join("")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+Next: .*$/s, "") // rodapé de navegação do JFB
    .trim();
}

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error("falhou: " + url);
}

const NT = "MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split(" ");
const args = process.argv.slice(2);
let wanted = args.length ? args : ["JHN"];
const totals = {};

for (const source of SOURCES) {
  fs.mkdirSync(path.join(OUT, source), { recursive: true });
  const index = await get(`https://bible.helloao.org/api/c/${source}/books.json`);
  const avail = new Map((index?.books ?? []).map((b) => [b.id, b.numberOfChapters]));
  const books = wanted.flatMap((w) => (w === "nt" ? NT : w === "ot" ? [...avail.keys()].filter((id) => !NT.includes(id)) : [w]));
  let chars = 0;
  for (const book of books) {
    const chapters = avail.get(book) ?? 0;
    let bookChars = 0;
    for (let ch = 1; ch <= chapters; ch++) {
      const json = await get(`https://bible.helloao.org/api/c/${source}/${book}/${ch}.json`);
      const blocks = [];
      if (json) {
        const intro = clean([json.chapter?.introduction ?? ""]);
        if (intro) blocks.push({ verse: 1, kind: "intro", text: intro });
        for (const item of json.chapter?.content ?? []) {
          if (item.type !== "verse") continue;
          const text = clean(item.content ?? []);
          if (text) blocks.push({ verse: item.number, kind: "verse", text });
        }
      }
      fs.writeFileSync(path.join(OUT, source, `${book}-${ch}.json`), JSON.stringify({ source, book, chapter: ch, blocks }, null, 1));
      bookChars += blocks.reduce((s, b) => s + b.text.length, 0);
    }
    chars += bookChars;
    console.log(`${source} ${book}: ${chapters} capítulos, ${bookChars} caracteres`);
  }
  totals[source] = chars;
  console.log(`== ${source}: ${chars} caracteres no total
`);
}
console.log(JSON.stringify(totals));
