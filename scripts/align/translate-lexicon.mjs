// Traduz para PT-BR os lotes lex-NN.input.json que ainda não têm lex-NN.pt.json, via Message
// Batches API (Claude Haiku 4.5, 50% mais barato, assíncrono). Um pedido por lote de 80 verbetes.
// O id do batch fica em work/lex-batch.json: rodar de novo retoma a espera em vez de reenviar.
// Uso: ANTHROPIC_API_KEY=... node scripts/align/translate-lexicon.mjs
// Depois: node scripts/align/validate-lexicon.mjs all  (lote que falhar: apague o .pt.json e rode de novo)
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const WORK = "scripts/align/work";
const STATE = `${WORK}/lex-batch.json`;
const client = new Anthropic();

// Mesmas regras de LEX-PROMPT.md (o que os lotes de João seguiram).
const SYSTEM = `Você traduz verbetes do léxico grego do Novo Testamento (STEPBible, em inglês) para o português do Brasil.
Para cada entrada { strong, lemma, gloss, definition } devolva { strong, gloss_pt, definition_pt }, um item por entrada, na mesma ordem, com o mesmo strong.
- gloss_pt: sentidos curtos em PT-BR, separados por vírgula, no máximo 6 palavras ("palavra, mensagem, razão").
- definition_pt: 1 a 3 frases curtas em PT-BR, só o que o verbete diz (sem teologia nova, sem opinião). Referências bíblicas no formato brasileiro ("Jo 1.1", "Mt 5.3", "1Co 13.4", "Ap 21.6").
- Nada de inglês no resultado. Nomes próprios no nome usual em português ("Pedro", "Jerusalém").
- Não traduza abreviações do léxico (LXX, al., cf., AS, LS, Thayer): omita.
- Pode citar uma palavra grega quando o verbete a usa como exemplo, mas a explicação é sempre em português.`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { strong: { type: "string" }, gloss_pt: { type: "string" }, definition_pt: { type: "string" } },
        required: ["strong", "gloss_pt", "definition_pt"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const pending = fs.readdirSync(WORK)
  .filter((f) => /^lex-\d+\.input\.json$/.test(f) && !fs.existsSync(`${WORK}/${f.replace(".input.", ".pt.")}`))
  .map((f) => f.slice(0, 6)); // "lex-14"

let id = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")).id : null;
if (!id) {
  if (!pending.length) { console.log("Nada pendente."); process.exit(0); }
  const batch = await client.messages.batches.create({
    requests: pending.map((name) => ({
      custom_id: name,
      params: {
        model: "claude-haiku-4-5",
        max_tokens: 16000,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: fs.readFileSync(`${WORK}/${name}.input.json`, "utf8") }],
      },
    })),
  });
  id = batch.id;
  fs.writeFileSync(STATE, JSON.stringify({ id, lots: pending }));
  console.log(`Batch ${id} enviado com ${pending.length} lotes.`);
}

let batch;
for (;;) {
  batch = await client.messages.batches.retrieve(id);
  if (batch.processing_status === "ended") break;
  console.log(`${new Date().toLocaleTimeString()} processando: ${batch.request_counts.processing}`);
  await new Promise((r) => setTimeout(r, 60_000));
}

let ok = 0;
const bad = [];
for await (const r of await client.messages.batches.results(id)) {
  const msg = r.result.type === "succeeded" ? r.result.message : null;
  const text = msg?.stop_reason === "end_turn" ? msg.content.find((b) => b.type === "text")?.text : null;
  if (!text) { bad.push(`${r.custom_id}: ${r.result.type}${msg ? ` / ${msg.stop_reason}` : ""}`); continue; }
  fs.writeFileSync(`${WORK}/${r.custom_id}.pt.json`, JSON.stringify(JSON.parse(text).items, null, 1));
  ok++;
}
fs.rmSync(STATE); // próximo run reenvia só o que ficou sem .pt.json
console.log(`${ok} lotes gravados.`);
if (bad.length) console.log(`Sem resultado (rode de novo para reenviar):\n  ${bad.join("\n  ")}`);
