// Só prepara carga após build-ot completo e medição de qualidade aprovada.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
const root = "scripts/align/work";
const build = JSON.parse(fs.readFileSync(`${root}/gem-ot/build-status.json`, "utf8"));
const pilot = JSON.parse(fs.readFileSync(`${root}/gem-ot-word-pilot/pilot-quality.json`, "utf8"));
assert(build.ready && build.verses === 23145, "AT ainda não está completo e validado");
const heldOut = ["GEN-22", "RUT-01", "PSA-51", "PRO-03", "JER-31", "2KI-05"];
assert(heldOut.every((name) => pilot.chapters.some((ch) => ch.chapter === name)), "Faltam capítulos de medição");
assert(pilot.agreement >= 94, "Qualidade abaixo da meta de 94%");
const verses = new Map();
for (const line of fs.readFileSync(`${root}/tagged-ot-complete.tsv`, "utf8").split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [translation,book,chapter,verse,position,text,strong] = line.split("\t");
  const key = `${book}:${chapter}:${verse}`;
  if (!verses.has(key)) verses.set(key, { translation,book,chapter:Number(chapter),verse:Number(verse),parts:[] });
  verses.get(key).parts.push([Number(position),text,strong || null]);
}
const rows = [...verses.values()].map(({parts,...row}) => ({ ...row,spans:parts.sort((a,b)=>a[0]-b[0]).map(([,text,strong])=>[text,strong]) }));
assert.equal(rows.length,23145);
const payload = JSON.stringify(rows);
const dir = `${root}/gem-ot/load`;
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/rows.json`,payload);
fs.writeFileSync(`${dir}/manifest.json`,JSON.stringify({ rows:rows.length,bytes:Buffer.byteLength(payload),reserveBytes:Buffer.byteLength(payload)*3+16777216,sha256:createHash("sha256").update(payload).digest("hex"),build,pilot },null,2));
if (!fs.existsSync(`${dir}/token.txt`)) fs.writeFileSync(`${dir}/token.txt`,randomBytes(32).toString("hex"));
const token = fs.readFileSync(`${dir}/token.txt`,"utf8").trim();
assert(/^[a-f0-9]{64}$/.test(token));
fs.writeFileSync(`${dir}/load.sql`,fs.readFileSync("scripts/align/tagged-ot-loader.sql","utf8").replace("__LOAD_TOKEN__",token));
console.log(`${rows.length} versículos prontos; dados, manifesto e SQL em ${dir}`);
