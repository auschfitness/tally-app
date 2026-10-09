// Traduz os lotes de comentários pela API do Gemini (grátis) e confere cada um com o validador.
// Uso: [SHARD=1/4] node scripts/comments/translate-gemini.mjs [modelo]   (rode depois de build-batches.mjs)
// Chaves: GEMINI_API_KEY=k1,k2,... no .env.local (rodízio quando uma dá 429).
// Lote que já passa no validador é pulado; lote que falha é refeito até 4 vezes com o erro no pedido.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const WORK = path.join("scripts", "comments", "work");
const model = process.argv[2] || "gemini-3.5-flash";
const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const KEYS = [...new Set(`${env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1] ?? ""},${process.env.GEMINI_API_KEY ?? ""}`.split(/[,\s]+/).filter(Boolean))];
if (!KEYS.length) { console.error("Defina GEMINI_API_KEY no .env.local"); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RULES = fs.readFileSync(path.join("scripts", "comments", "COMMENTS-PROMPT.md"), "utf8")
  .split("Regras:")[1].split("Ao terminar")[0]
  .replace(/- Traduzir À MÃO.*\n/, "");
const SYSTEM = `Você traduz comentários bíblicos do inglês para o português do Brasil.
Recebe [{ id, book, source, chapter, verse, kind, text }] (book em código USFM: ROM, MAT, EPH...; jfb = Jamieson-Fausset-Brown; tyn = Tyndale).
Devolve SÓ JSON: [{ id, text_pt }], um item por entrada, mesma ordem, mesmos id. Traduza o bloco inteiro, sem cortar nada.
Regras:${RULES}`;

const validate = (n) => {
  try { execFileSync("node", ["scripts/comments/validate-comments.mjs", String(n)], { encoding: "utf8" }); return null; }
  catch (e) { return String(e.stdout || e.message).trim(); }
};

let keyIdx = 0;
async function ask(input, hint) {
  for (let tries = 0; tries < KEYS.length * 3; tries++) {
    const key = KEYS[keyIdx++ % KEYS.length];
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: (hint ? `Na tentativa anterior o validador reclamou:\n${hint}\nCorrija isso.\n\n` : "") + JSON.stringify(input) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 65536 },
        }),
        signal: AbortSignal.timeout(300000),
      });
    } catch { await sleep(5000); continue; }
    if (res.status === 429 || res.status >= 500) { await sleep(tries >= KEYS.length ? 30000 : 2000); continue; }
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = await res.json();
    const txt = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").replace(/^```(json)?|```$/g, "").trim();
    try { return JSON.parse(txt); } catch { return null; }
  }
  throw new Error("todas as chaves sem cota");
}

// SHARD=1/4 roda só um quarto dos lotes (vários processos em paralelo, cada um com o seu).
const [shard, shards] = (process.env.SHARD || "1/1").split("/").map(Number);
const nums = fs.readdirSync(WORK).filter((f) => /^batch-\d+\.input\.json$/.test(f)).map((f) => Number(f.match(/\d+/)[0]))
  .filter((n) => n % shards === shard - 1).sort((a, b) => a - b);
const pad = (n) => String(n).padStart(2, "0");
const bad = [];
for (const n of nums) {
  const out = path.join(WORK, `batch-${pad(n)}.pt.json`);
  if (fs.existsSync(out) && !validate(n)) continue;
  const input = JSON.parse(fs.readFileSync(path.join(WORK, `batch-${pad(n)}.input.json`), "utf8"));
  let err = null;
  for (let t = 1; t <= 4; t++) {
    const pt = await ask(input, err);
    if (!Array.isArray(pt)) { err = "a resposta não era um array JSON [{ id, text_pt }]"; continue; }
    const cleaned = pt.map((x) => ({
      id: x.id,
      text_pt: String(x.text_pt ?? "").replace(/[—–]/g, "-")
    }));
    fs.writeFileSync(out, JSON.stringify(cleaned, null, 1));
    err = validate(n);
    if (!err) break;
  }
  console.log(`lote ${n}/${nums.at(-1)}: ${err ? "FALHOU" : "ok"}`);
  if (err) { bad.push(n); console.log(err.split("\n").slice(0, 6).join("\n")); }
}
console.log(bad.length ? `Lotes com erro (rode de novo para refazer): ${bad.join(", ")}` : "Todos os lotes ok. Agora: node scripts/comments/validate-comments.mjs all");
