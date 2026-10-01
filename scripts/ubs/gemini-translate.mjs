// Traduz lotes do dicionário UBS (ES → PT) pela API do Gemini, sem gastar Claude.
// Cada lote passa pelo mesmo conferidor (validate-ubs.mjs); reprovado é refeito até 3 vezes.
// Lote que já tem saída aprovada é pulado, então dá para rodar de novo sem medo.
// Uso: GEMINI_API_KEY=... node scripts/ubs/gemini-translate.mjs 32-106 [modelo] [paralelos]
import fs from "node:fs";
import { checkBatch } from "./validate-ubs.mjs";

const DIR = "scripts/ubs/work";
const KEY = process.env.GEMINI_API_KEY;
const [a, b] = (process.argv[2] ?? "").split("-").map(Number);
const MODEL = process.argv[3] ?? "gemini-3.5-flash";
const PARALLEL = Number(process.argv[4] ?? 4);
const CHUNK = 20;
if (!KEY || !Number.isInteger(a)) {
  console.error("Uso: GEMINI_API_KEY=... node scripts/ubs/gemini-translate.mjs <A-B> [modelo] [paralelos]");
  process.exit(1);
}
const pad = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RULES = `Você é tradutor espanhol → português do Brasil de um dicionário bíblico (Dicionário Grego do NT da UBS).
Recebe um array JSON [{ id, glosses, short, comments }] e devolve SÓ um array JSON [{ id, glosses_pt, short_pt, comments_pt }],
um item por entrada, mesma ordem, mesmo id, TODOS os itens.
- Português do Brasil, natural e fiel, sem resumir nem acrescentar nada.
- glosses_pt: array com as glosas traduzidas. short_pt: a definição inteira. comments_pt: o comentário INTEIRO
  (mantenha o separador " | " entre parágrafos; vazio na entrada = "" na saída).
- Palavras gregas e hebraicas e marcações entre chaves ({S:...}, {L:...}, {D:...}, {N:...}) ficam exatamente como estão.
- Referências bíblicas no padrão brasileiro: Jn → Jo, Hch → At, Ro → Rm, Stg → Tg, Mr → Mc, Gá → Gl, Fil → Fp, He → Hb.
- Nada de espanhol no resultado ("el", "los", "y", "según", "-ción" → "-ção").`;

async function translate(input) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 65536, ...(MODEL.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
    }),
  });
  if (res.status === 429 || res.status >= 500) return { retryAfter: res.status === 429 ? 60000 : 15000, error: `HTTP ${res.status}` };
  const body = await res.json();
  if (!res.ok) return { error: `HTTP ${res.status}: ${body.error?.message ?? ""}`.slice(0, 200) };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return { out: JSON.parse(text.replace(/^```(json)?\s*|\s*```$/g, "")) };
  } catch {
    return { error: `JSON inválido (${body.candidates?.[0]?.finishReason ?? "?"})` };
  }
}

async function doBatch(n) {
  const inFile = `${DIR}/ubs-${pad(n)}.input.json`, outFile = `${DIR}/ubs-${pad(n)}.pt.json`;
  if (!fs.existsSync(inFile)) return `lote ${n}: sem entrada`;
  const input = JSON.parse(fs.readFileSync(inFile, "utf8"));
  if (fs.existsSync(outFile)) {
    try {
      if (!checkBatch(input, JSON.parse(fs.readFileSync(outFile, "utf8"))).length) return `lote ${n}: já ok`;
    } catch {
      /* saída quebrada: refaz */
    }
  }
  // Pedido grande demais volta 503 no Gemini: vai em pedaços de CHUNK itens, cada um
  // conferido e refeito sozinho.
  const out = [];
  for (let i = 0; i < input.length; i += CHUNK) {
    const part = input.slice(i, i + CHUNK);
    let last = "", done = null;
    for (let attempt = 1; attempt <= 5 && !done; attempt++) {
      const r = await translate(part);
      if (r.retryAfter) {
        last = r.error;
        await sleep(r.retryAfter);
        continue;
      }
      if (r.error) {
        last = r.error;
        continue;
      }
      const errors = checkBatch(part, r.out);
      if (errors.length) last = `${errors.length} erros: ${errors[0]}`;
      else done = r.out;
    }
    if (!done) return `lote ${n}: FALHOU nos itens ${i}-${i + part.length - 1} (${last})`;
    out.push(...done);
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  return `lote ${n}: ok`;
}

const queue = [];
for (let n = a; n <= (b || a); n++) queue.push(n);
const results = [];
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
      const line = await doBatch(n);
      console.log(line);
      results.push(line);
    }
  }),
);
const failed = results.filter((l) => l.includes("FALHOU"));
console.log(`\nresumo: ${results.length - failed.length} ok, ${failed.length} falharam`);
