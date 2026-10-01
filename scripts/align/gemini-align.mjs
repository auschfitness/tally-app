// Frente B da spec 09, plano B: ligação português ↔ grego pela API do Gemini (grátis),
// com TODA palavra sublinhada (palavra pequena ou acrescentada pela tradução se agrupa com
// a palavra de conteúdo vizinha, como no gabarito de João e no Raízes).
// Pedaços de até 12 versículos; cada versículo é conferido (texto idêntico, Strong do
// próprio versículo, trecho ligado sem espaço nas pontas) e refeito até 4 vezes.
// Uso (de scripts/align): GEMINI_API_KEY=... node gemini-align.mjs JHN 14-16 [modelo]
//   saída: work/gem/<LIVRO>-NN.align.json (mesmo formato de jhn-NN.align.json)
import fs from "node:fs";

const KEY = process.env.GEMINI_API_KEY;
const [book, range, model = "gemini-3.5-flash-lite"] = process.argv.slice(2);
const [a, b] = (range ?? "").split("-").map(Number);
if (!KEY || !book || !Number.isInteger(a)) {
  console.error("Uso: GEMINI_API_KEY=... node gemini-align.mjs <LIVRO> <A-B> [modelo]");
  process.exit(1);
}
const pad = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EDGE = /^[\s.,;:!?"'“”‘’()\[\]—–-]|[\s.,;:!?"'“”‘’()\[\]—–-]$/;
const CHUNK = 12;

const RULES = `Você liga um texto bíblico em português (Bíblia Livre) às palavras gregas do original.
Recebe [{ verse, pt, greek: [{ p, w, s, g }] }] (s = número Strong, g = glosa inglesa).
Devolve SÓ JSON: [{ verse, spans: [{ t, s }] }], um item por versículo, mesma ordem.
Regras:
1. Concatenar os t de um versículo devolve pt EXATAMENTE (espaços e pontuação inclusos).
2. Espaços e pontuação ficam em trechos próprios com s: null. Trecho com Strong não começa nem termina com espaço ou pontuação.
3. s só pode ser um Strong que aparece no greek daquele versículo. Um Strong por trecho.
4. TODA palavra portuguesa fica num trecho com Strong. Artigos, preposições, pronomes oblíquos e verbos auxiliares entram no trecho da palavra que acompanham ("No princípio" → Strong de ἀρχῇ; "tens enviado" → Strong de ἀπέστειλας; "se perturbe" → Strong de ταρασσέσθω). Palavra acrescentada pela tradução entra no trecho da palavra vizinha a que se refere.
5. Artigo grego (G3588) só ganha trecho próprio se não houver palavra de conteúdo para ele.`;

async function ask(verses) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(verses) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 65536 },
    }),
  });
  if (res.status === 429 || res.status >= 500) return { wait: res.status === 429 ? 60000 : 15000 };
  const body = await res.json();
  if (!res.ok) return { error: `HTTP ${res.status}` };
  try {
    return { out: JSON.parse((body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("")) };
  } catch {
    return { error: "JSON inválido" };
  }
}

export function checkVerse(v, got) {
  if (!got || !Array.isArray(got.spans)) return "sem spans";
  if (got.spans.map((x) => x.t).join("") !== v.pt) return "texto diferente do original";
  const ok = new Set(v.greek.map((g) => g.s));
  for (const x of got.spans) {
    if (!x.s) continue;
    if (!ok.has(x.s)) return `Strong ${x.s} fora do versículo`;
    if (EDGE.test(x.t)) return `trecho ligado com espaço/pontuação na ponta: "${x.t}"`;
  }
  return "";
}

fs.mkdirSync("work/gem", { recursive: true });
for (let ch = a; ch <= (b || a); ch++) {
  const src = book === "JHN" ? `work/jhn-${pad(ch)}.input.json` : `work/nt/${book}-${pad(ch)}.json`;
  const outFile = `work/gem/${book}-${pad(ch)}.align.json`;
  if (fs.existsSync(outFile)) {
    console.log(`${book} ${ch}: já feito`);
    continue;
  }
  const verses = JSON.parse(fs.readFileSync(src, "utf8")).verses.map(({ verse, pt, greek }) => ({ verse, pt, greek }));
  const result = new Map();
  let todo = verses;
  for (let attempt = 1; attempt <= 4 && todo.length; attempt++) {
    for (let i = 0; i < todo.length; i += CHUNK) {
      const part = todo.slice(i, i + CHUNK);
      let r = await ask(part);
      while (r.wait) {
        await sleep(r.wait);
        r = await ask(part);
      }
      if (!Array.isArray(r.out)) continue;
      for (const v of part) {
        const got = r.out.find((x) => x?.verse === v.verse);
        if (!checkVerse(v, got)) result.set(v.verse, { verse: v.verse, spans: got.spans.map(({ t, s }) => ({ t, s: s || null })) });
      }
    }
    todo = verses.filter((v) => !result.has(v.verse));
  }
  // Versículo que o modelo não acertou em 4 tentativas: fica como uma frase só, sem ligação
  // (o carregamento usa o alinhamento estatístico para ele).
  const out = verses.map((v) => result.get(v.verse) ?? { verse: v.verse, spans: [{ t: v.pt, s: null }], failed: true });
  fs.writeFileSync(outFile, "[\n" + out.map((v) => JSON.stringify(v)).join(",\n") + "\n]\n");
  console.log(`${book} ${ch}: ${result.size}/${verses.length} versículos`);
}
