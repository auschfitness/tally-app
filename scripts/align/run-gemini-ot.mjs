// Executa o AT com retomada e logs locais, sem alterar o banco.
// Uso da raiz: node --env-file=.env.local scripts/align/run-gemini-ot.mjs [--pilot]
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const dir = path.resolve("scripts/align");
const input = path.join(dir, "work/ot");
const pilotMode = process.argv.includes("--pilot");
if (pilotMode && !process.env.ALIGN_OUT_DIR) process.env.ALIGN_OUT_DIR = "work/gem-ot-word-pilot";
const output = path.join(dir, process.env.ALIGN_OUT_DIR || "work/gem-ot");
fs.mkdirSync(output, { recursive: true });
const pilot = ["GEN-22", "RUT-01", "PSA-51", "PRO-03", "JER-31", "2KI-05"];
const names = process.argv.includes("--pilot") ? pilot : fs.readdirSync(input)
  .filter((f) => /^[1-3A-Z]{3}-\d+\.json$/.test(f)).map((f) => f.slice(0, -5)).sort();
// No conjunto completo, gabaritos manuais são preservados pelo montador.
const queue = names.filter((name) => process.argv.includes("--pilot") || !fs.existsSync(path.join(input, name + ".gold.json")));
const logFile = path.join(output, pilotMode ? "pilot-run.log" : "run.log");
const statusFile = path.join(output, pilotMode ? "pilot-run-status.json" : "run-status.json");
const log = (line) => { console.log(line); fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`); };
const summary = { startedAt: new Date().toISOString(), requested: queue.length, finished: [], failed: [], quota: false };
let stopped = false;
const run = (name) => new Promise((resolve) => {
  const [book, chapter] = name.split("-");
  const child = spawn(process.execPath, ["gemini-align.mjs", book, String(Number(chapter))], { cwd: dir, env: process.env, windowsHide: true });
  let out = "";
  child.stdout.on("data", (chunk) => { out += chunk; process.stdout.write(chunk); fs.appendFileSync(logFile, chunk); });
  child.stderr.on("data", (chunk) => { out += chunk; fs.appendFileSync(logFile, chunk); });
  child.on("error", (error) => { log(`${name}: processo não iniciou (${error.message})`); resolve(1); });
  child.on("close", (code) => resolve(code));
});
await Promise.all(Array.from({ length: 2 }, async () => {
  for (let name = queue.shift(); name && !stopped; name = queue.shift()) {
    log(`Iniciando ${name}`);
    const code = await run(name);
    if (code === 2) { stopped = true; summary.quota = true; }
    else if (code !== 0) stopped = true;
    if (code === 0 && fs.existsSync(path.join(output, name + ".align.json"))) summary.finished.push(name);
    else summary.failed.push(name);
    fs.writeFileSync(statusFile, JSON.stringify(summary, null, 2));
  }
}));
summary.finishedAt = new Date().toISOString();
fs.writeFileSync(statusFile, JSON.stringify(summary, null, 2));
log(`Concluídos nesta execução: ${summary.finished.length}; falhas: ${summary.failed.length}; cota esgotada: ${summary.quota}`);
process.exitCode = summary.quota ? 2 : summary.failed.length ? 1 : 0;
