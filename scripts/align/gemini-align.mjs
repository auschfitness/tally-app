// Frente B da spec 09, plano B: ligação português ↔ grego pela API do Gemini (grátis),
// com TODA palavra sublinhada (palavra pequena ou acrescentada pela tradução se agrupa com
// a palavra de conteúdo vizinha, como no gabarito de João e no Raízes).
// Pedaços de até 12 versículos; cada versículo é conferido (texto idêntico, Strong do
// próprio versículo, trecho ligado sem espaço nas pontas) e refeito até 4 vezes.
// Uso (de scripts/align): GEMINI_API_KEY=k1,k2 [OPENROUTER_API_KEY=... OPENROUTER_MODELS=m1,m2] node gemini-align.mjs JHN 14-16 [modelo]
//   NT: work/nt -> work/gem/<LIVRO>-NN.align.json; AT (GEN...MAL): work/ot -> work/gem-ot/
//   Provedores em rodízio: as chaves Gemini; quando todas dão 429, os modelos grátis do OpenRouter.
//   Capítulo que concorda menos de 85% com o alinhador estatístico NÃO é gravado (modelo fraco).
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fixEdges, attachOrphans, checkVerse, compareSpans, restoreSourceText, indexedWords, spansFromWordTags } from "./alignment-quality.mjs";
export { fixEdges, attachOrphans, checkVerse } from "./alignment-quality.mjs";

const KEYS = (process.env.GEMINI_API_KEY || "").split(/[,\s]+/).map((k) => k.trim()).filter(Boolean);
const OR_KEY = process.env.OPENROUTER_API_KEY || "";
const OR_MODELS = (process.env.OPENROUTER_MODELS || "").split(/[,\s]+/).filter(Boolean);
const [book, range, model = "gemini-3.5-flash-lite"] = process.argv.slice(2);
const [a, b] = (range ?? "").split("-").map(Number);
const OT = fs.existsSync(`work/ot/${book}-01.json`);
const WORD_TAG_MODE = OT && process.env.ALIGN_WORD_TAGS !== "0";
const OUT_DIR = process.env.ALIGN_OUT_DIR || (OT ? "work/gem-ot" : "work/gem");
if (!(KEYS.length || (OR_KEY && OR_MODELS.length)) || !book || !Number.isInteger(a)) {
  console.error("Uso: GEMINI_API_KEY=... node gemini-align.mjs <LIVRO> <A-B> [modelo]");
  process.exit(1);
}
const pad = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHUNK = WORD_TAG_MODE ? 3 : 12;

const TEXT_RULES = `Você liga um texto bíblico em português (Bíblia Livre) às palavras do original (grego no NT, hebraico/aramaico no AT).
Recebe [{ verse, pt, greek: [{ p, w, s, g }] }] (greek = palavras do original, mesmo no AT; s = número Strong, g = glosa inglesa).
No hebraico, "e", artigo, preposição e possessivo costumam ser prefixo/sufixo da palavra: entram no trecho dela.
Devolve SÓ JSON: [{ verse, spans: [{ t, s }] }], um item por versículo, mesma ordem.
Regras:
1. Concatenar os t de um versículo devolve pt EXATAMENTE (espaços e pontuação inclusos).
2. Espaços e pontuação ficam em trechos próprios com s: null. Trecho com Strong não começa nem termina com espaço ou pontuação.
3. s só pode ser um Strong que aparece no greek daquele versículo. Exatamente UM Strong por trecho (ex: "G2532"). Proibido múltiplos Strongs no mesmo trecho.
4. TODA palavra portuguesa fica num trecho com Strong. Artigos, preposições, pronomes oblíquos e verbos auxiliares entram no trecho da palavra que acompanham ("No princípio" → Strong de ἀρχῇ; "tens enviado" → Strong de ἀπέστειλας; "se perturbe" → Strong de ταρασσέσθω). Palavra acrescentada pela tradução entra no trecho da palavra vizinha a que se refere. Ex.: "em Deus" é UM trecho só (Strong de θεὸν); "o caminho" é UM trecho só (Strong de ὁδὸν). Nunca isole a preposição ou o artigo num trecho próprio quando há palavra de conteúdo junto. Mesmo que o grego tenha a preposição correspondente (εἰς, ἐν, πρός, διά, ἀπό...), ela entra no trecho do substantivo ou verbo. Exceção: partícula de negação (οὐ, μή) e pronome com correspondente grego explícito (ὑμᾶς, ἐγώ) ganham trecho próprio.
5. Artigo grego (G3588) só ganha trecho próprio se não houver palavra de conteúdo para ele.`;

const RULES = WORD_TAG_MODE ? `Você liga as palavras portuguesas da Bíblia Livre às palavras hebraicas/aramaicas do próprio versículo.
Entrada: [{verse, pt, words:[{p,w}], greek:[{p,w,s,g}]}]. words são as palavras portuguesas numeradas; greek são as palavras hebraicas/aramaicas com Strong s e glosa g.
Saída SOMENTE um array JSON [{verse, tags:[{p,s}]}], em ordem. Devolva exatamente UMA tag para CADA posição p de words, sem pular nenhuma nem criar posições.
O s de cada tag é exatamente um Strong da lista greek DO MESMO versículo. Nenhuma tag tem s null. Não devolva texto nem spans.
Use o significado e a gramática, não apenas a proximidade. Artigos, preposições e pronomes possessivos acompanham o Strong do substantivo/verbo a que se referem. No hebraico frequentemente são prefixos/sufixos.
Palavras acrescentadas pela tradução acompanham a palavra de conteúdo a que se referem. Negações e pronomes com correspondente explícito recebem seu próprio Strong.
Todos os elementos de uma expressão portuguesa que traduz a mesma palavra hebraica recebem o mesmo Strong. Não use a marca de objeto את H0853 para um conteúdo português sem correspondente.` : TEXT_RULES;
const requestInput = (verses) => WORD_TAG_MODE ? verses.map((v) => ({ ...v, words: indexedWords(v.pt) })) : verses;

// OpenRouter (API no formato OpenAI). 429 = esse modelo está lotado: tenta o próximo.
let orIdx = 0;
async function askOpenRouter(verses) {
  for (let n = 0; n < OR_MODELS.length; n++) {
    const m = OR_MODELS[orIdx++ % OR_MODELS.length];
    let res;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${OR_KEY}` },
        body: JSON.stringify({
          model: m,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: RULES + "\nResponda com um objeto JSON { \"verses\": [...] }." },
            { role: "user", content: JSON.stringify(requestInput(verses)) },
          ],
        }),
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      continue;
    }
    if (!res.ok) continue;
    try {
      const body = await res.json();
      const txt = (body.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim();
      const parsed = JSON.parse(txt);
      const out = Array.isArray(parsed) ? parsed : parsed.verses;
      if (Array.isArray(out)) return { out, via: m };
    } catch {}
  }
  return null;
}

let keyIdx = 0;
async function ask(verses) {
  const r = await askGemini(verses);
  if (r.wait && OR_KEY && OR_MODELS.length) return (await askOpenRouter(verses)) ?? r;
  return r;
}

async function askGemini(verses) {
  let attempts = 0;
  while (attempts < KEYS.length) {
    const key = KEYS[keyIdx % KEYS.length];
    keyIdx++;
    attempts++;
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: RULES }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(requestInput(verses)) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 65536 },
        }),
        signal: AbortSignal.timeout(60000),
      });
    } catch {
      return { error: "rede falhou (timeout)" };
    }
    if (res.status === 429) continue;
    if (res.status >= 500) return { wait: 15000 };
    const body = await res.json();
    if (!res.ok) return { error: `HTTP ${res.status}` };
    try {
      return { out: JSON.parse((body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("")) };
    } catch {
      return { error: "JSON inválido" };
    }
  }
  return { wait: 60000 };
}

// Concordância com o alinhador estatístico nas palavras que os dois ligam (trava de qualidade:
// o Gemini dá 89-94%; modelo fraco que só acerta o formato cai para 40-70%).
function agreement(outVerses, statFile) {
  if (!fs.existsSync(statFile)) return 1;
  const stat = new Map(JSON.parse(fs.readFileSync(statFile, "utf8")).map((v) => [v.verse, v.spans]));
  let same = 0, both = 0;
  for (const v of outVerses) {
    const st = stat.get(v.verse);
    if (!st) continue;
    const score = compareSpans(v.spans, st);
    same += score.same; both += score.both;
  }
  return both ? same / both : 1;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (let ch = a; ch <= (b || a); ch++) {
  const src = book === "JHN" ? `work/jhn-${pad(ch)}.input.json` : `work/${OT ? "ot" : "nt"}/${book}-${pad(ch)}.json`;
  const outFile = `${OUT_DIR}/${book}-${pad(ch)}.align.json`;
  if (fs.existsSync(outFile)) {
    console.log(`${book} ${ch}: já feito`);
    continue;
  }
  const verses = JSON.parse(fs.readFileSync(src, "utf8")).verses.map(({ verse, pt, greek }) => ({ verse, pt, greek }));
  const sourceHash = createHash("sha256").update(JSON.stringify(verses)).digest("hex");
  const partialFile = `${OUT_DIR}/${book}-${pad(ch)}.partial.json`;
  const result = new Map();
  if (fs.existsSync(partialFile)) {
    const partial = JSON.parse(fs.readFileSync(partialFile, "utf8"));
    if (partial.sourceHash === sourceHash && partial.model === model) {
      for (const got of partial.verses ?? []) {
        const input = verses.find((v) => v.verse === got.verse);
        if (input && !checkVerse(input, got)) result.set(got.verse, got);
      }
      console.log(`${book} ${ch}: retomando ${result.size}/${verses.length} versículos`);
    }
  }
  const reasons = new Map();
  const runBatch = async (list, size) => {
    let netFail = 0;
    for (let i = 0; i < list.length; i += size) {
      const part = list.slice(i, i + size);
      let r = await ask(part);
      let waits = 0;
      while (r.wait) {
        waits++;
        console.log(`${book} ${ch}: API indisponível, tentativa ${waits}/3`);
        if (waits > 2) { r = { error: "cota ou indisponibilidade persistente da API" }; break; }
        await sleep(r.wait);
        r = await ask(part);
      }
      if (r.error || !Array.isArray(r.out)) {
        if (r.error?.startsWith("cota")) {
          console.log(`${book} ${ch}: cota esgotada; progresso parcial preservado`);
          process.exit(2);
        }
        for (const v of part) reasons.set(v.verse, r.error || "resposta nao e array");
        if (r.error && r.error.indexOf("rede falhou") === 0) {
          netFail++;
          if (netFail >= 3) throw new Error("rede falhou 3 vezes seguidas, abortando capitulo " + ch);
        }
        continue;
      }
      netFail = 0;
      for (const v of part) {
        const got = r.out.find((x) => x && x.verse === v.verse);
        const fixed = WORD_TAG_MODE ? spansFromWordTags(v, got) : got && Array.isArray(got.spans) ? restoreSourceText(v, { spans: fixEdges(attachOrphans(fixEdges(got.spans))) }) : got;
        const why = checkVerse(v, fixed);
        if (!why) result.set(v.verse, { verse: v.verse, spans: fixed.spans.map(({ t, s }) => ({ t, s: s || null })) });
        else reasons.set(v.verse, why);
      }
      fs.writeFileSync(partialFile, JSON.stringify({ sourceHash, model, verses: [...result.values()] }));
      console.log(`${book} ${ch}: conferidos ${result.size}/${verses.length} versículos`);
    }
  };
  await runBatch(verses.filter((v) => !result.has(v.verse)), CHUNK);
  for (let attempt = 2; attempt <= 4; attempt++) {
    const todo = verses.filter((v) => !result.has(v.verse));
    if (!todo.length) break;
    await runBatch(todo, 1);
  }
  // Cota acabou: não grava (senão o capítulo fica "já feito" com versículos falhos para sempre).
  if ([...reasons.values()].some((r) => String(r).startsWith("cota"))) {
    console.log(`${book} ${ch}: cota do Gemini esgotada, parando sem gravar; rode de novo mais tarde`);
    process.exit(2);
  }
  for (const v of verses) {
    if (!result.has(v.verse)) console.log(`${book} ${ch} v${v.verse}: ${reasons.get(v.verse) || "falha"}`);
  }
  // Versículo que o modelo não acertou em 4 tentativas: fica como uma frase só, sem ligação
  // (o carregamento usa o alinhamento estatístico para ele).
  const out = verses.map((v) => result.get(v.verse) ?? { verse: v.verse, spans: [{ t: v.pt, s: null }], failed: true });
  const agr = agreement([...result.values()], `work/${OT ? "ot" : "nt"}/${book}-${pad(ch)}.align.stat.json`);
  if (agr < 0.85) {
    console.log(`${book} ${ch}: só ${Math.round(agr * 100)}% de acordo com o estatístico, NÃO gravado (refaça depois)`);
    continue;
  }
  fs.writeFileSync(outFile, "[\n" + out.map((v) => JSON.stringify(v)).join(",\n") + "\n]\n");
  console.log(`${book} ${ch}: ${result.size}/${verses.length} versículos, acordo ${Math.round(agr * 100)}%`);
}
