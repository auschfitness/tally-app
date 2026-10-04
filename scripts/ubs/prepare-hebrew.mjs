// Prepara SDBH oficial PT em work/hebrew, separado dos lotes gregos.
// Uso: node scripts/ubs/prepare-hebrew.mjs
import fs from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { hebrewRows } from "./hebrew-data.mjs";
import { verseMapper } from "./hebrew-versification.mjs";

const DIR = "scripts/ubs/work/hebrew";
const base = "https://raw.githubusercontent.com/ubsicap/ubs-open-license/main/dictionaries/hebrew/";
const files = ["JSON/UBSHebrewDic-v0.9.3-pt.JSON", "JSON/UBSHebrewDicLexicalDomains-v0.9.3-pt.JSON", "README.md", "LICENSE.md"];
fs.mkdirSync(DIR, { recursive: true });
for (const file of files) {
  const local = `${DIR}/${file.split("/").at(-1)}`;
  if (!fs.existsSync(local)) {
    const res = await fetch(base + file);
    if (!res.ok) throw new Error(`Fonte UBS: HTTP ${res.status}`);
    fs.writeFileSync(local, await res.text());
  }
}
const read = (name) => JSON.parse(fs.readFileSync(`${DIR}/${name}`, "utf8").replace(/^\uFEFF/, ""));
const stepBase = "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/";
const stepFiles = ["Gen-Deu", "Jos-Est", "Job-Sng", "Isa-Mal"].map((range) => `Translators Amalgamated OT+NT/TAHOT ${range} - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`);
for (const file of stepFiles) {
  const local = `${DIR}/${file.split("/").at(-1)}`;
  if (!fs.existsSync(local)) {
    const res = await fetch(stepBase + encodeURI(file));
    if (!res.ok) throw new Error(`Fonte STEPBible: HTTP ${res.status}`);
    fs.writeFileSync(local, await res.text());
  }
}
const mapVerse = verseMapper(stepFiles.map((f) => fs.readFileSync(`${DIR}/${f.split("/").at(-1)}`, "utf8")));
const { rows, report } = hebrewRows(read("UBSHebrewDic-v0.9.3-pt.JSON"), read("UBSHebrewDicLexicalDomains-v0.9.3-pt.JSON"), mapVerse);
if (!rows.length || report.invalidRefs) throw new Error(`Dados incompletos ou referências inválidas: ${JSON.stringify(report)}`);
const payload = JSON.stringify(rows);
fs.writeFileSync(`${DIR}/rows.json`, payload);
const bytes = Buffer.byteLength(payload);
const manifest = { ...report, rows: rows.length, strongs: new Set(rows.map((r) => r.strong)).size,
  bytes, conservativeReserveBytes: bytes * 3 + 16777216,
  sha256: createHash("sha256").update(payload).digest("hex"),
  sources: files.map((f) => ({ url: base + f, sha256: createHash("sha256").update(fs.readFileSync(`${DIR}/${f.split("/").at(-1)}`)).digest("hex") })),
  versificationSources: stepFiles.map((f) => ({ url: stepBase + encodeURI(f), sha256: createHash("sha256").update(fs.readFileSync(`${DIR}/${f.split("/").at(-1)}`)).digest("hex") })),
  attribution: "UBS Dictionary of Biblical Hebrew © United Bible Societies, 2023. Adapted from Semantic Dictionary of Biblical Hebrew © 2000-2023 United Bible Societies. Edição portuguesa da UBS; adaptação de formato Tally; CC BY-SA 4.0.",
};
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify(manifest, null, 2));
// Preserva a senha entre preparações para não invalidar uma função já criada.
const tokenFile = `${DIR}/load-token.txt`;
if (!fs.existsSync(tokenFile)) fs.writeFileSync(tokenFile, randomBytes(32).toString("hex"));
const token = fs.readFileSync(tokenFile, "utf8").trim();
if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Senha local inválida");
fs.writeFileSync(`${DIR}/load.sql`, fs.readFileSync("scripts/ubs/hebrew-loader.sql", "utf8").replace("__LOAD_TOKEN__", token));
console.log(JSON.stringify({ ...report, rows: manifest.rows, strongs: manifest.strongs, payloadMB: +(bytes / 1000000).toFixed(2), reserveMB: +(manifest.conservativeReserveBytes / 1000000).toFixed(2) }, null, 2));
console.log("Pronto: work/hebrew/rows.json, manifest.json e load.sql. Nada foi gravado no banco.");
