// Baixa os comentários de João (Frente C, spec 09) da API helloao e grava um JSON enxuto por capítulo.
// Uso: node scripts/comments/fetch.mjs            (21 capítulos x 2 fontes)
// Saída: scripts/comments/work/<fonte>/JHN-<cap>.json  (pasta ignorada pelo git)
// Formato: { source, chapter, blocks: [{ verse, kind: "intro"|"verse", text }] }
//   "intro" = texto que a API devolve como introdução do capítulo (no JFB cobre João 1.1 em diante).
import fs from "node:fs";
import path from "node:path";

const SOURCES = ["jamieson-fausset-brown", "tyndale"];
const CHAPTERS = 21;
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

for (const source of SOURCES) {
  fs.mkdirSync(path.join(OUT, source), { recursive: true });
  let chars = 0;
  for (let ch = 1; ch <= CHAPTERS; ch++) {
    const json = await get(`https://bible.helloao.org/api/c/${source}/JHN/${ch}.json`);
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
    fs.writeFileSync(path.join(OUT, source, `JHN-${ch}.json`), JSON.stringify({ source, chapter: ch, blocks }, null, 1));
    const n = blocks.reduce((s, b) => s + b.text.length, 0);
    chars += n;
    console.log(`${source} JHN ${ch}: ${blocks.length} blocos, ${n} caracteres`);
  }
  console.log(`== ${source}: ${chars} caracteres no total\n`);
}
