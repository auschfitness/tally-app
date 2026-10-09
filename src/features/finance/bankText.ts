// Texto do extrato em linguagem de gente. O banco manda "PIX ENVIADO IMOBILIARIA SOL";
// a tela mostra "Imobiliaria Sol" (o original fica no detalhe). E um PIX recebido com nome
// ("PIX RECEBIDO MARIA S OLIVEIRA") vira o dízimo da Maria. Regras puras; testes em bankText.test.ts.
import { normalizeText } from "./domain";

// Ruído do banco no começo da descrição, do mais longo para o mais curto.
const PREFIXES = [
  "pix enviado", "pix recebido", "pix env", "pix rec", "pix",
  "ted enviada", "ted recebida", "ted", "doc enviado", "doc recebido", "doc",
  "debito automatico", "deb automatico", "deb aut",
  "pagto convenio", "pagamento convenio", "pagto boleto", "pagamento boleto", "pagto", "pagamento",
  "compra cartao", "compra debito", "compra credito", "compra",
  "transferencia recebida", "transferencia enviada", "transferencia", "transf recebida", "transf enviada", "transf",
  "deposito", "dep",
  "recebimento", "receb",
];

const SMALL = new Set(["de", "da", "do", "das", "dos", "e"]);

function stripPrefix(words: string[]): string[] {
  const joined = words.join(" ");
  for (const p of PREFIXES) {
    if (joined === p) return [];
    if (joined.startsWith(`${p} `)) return words.slice(p.split(" ").length);
  }
  return words;
}

// Só mexe no texto todo em maiúsculas (cara de extrato); o que a pessoa digitou fica como está.
export function cleanMemo(memo: string): string {
  const raw = memo.trim();
  if (!raw || /[a-zà-ÿ]/.test(raw)) return raw;
  const original = raw.split(/\s+/);
  const kept = stripPrefix(original.map((w) => normalizeText(w)));
  const words = (kept.length > 0 ? original.slice(original.length - kept.length) : original).map((w) => w.toLowerCase());
  return words
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Palavras que dizem o que é o dinheiro, não de quem é. Saem do fim do nome
// ("MARIA S OLIVEIRA DOACAO") e, se sobrarem só elas, não há pessoa.
const NOT_NAME = new Set([
  "dizimo", "dizimos", "oferta", "ofertas", "doacao", "doacoes", "culto", "cultos", "domingo", "sabado",
  "missoes", "missao", "igreja", "campanha", "construcao", "evento", "retiro", "jovens", "pgto", "pagamento",
  "ref", "referente", "mes", "mensal", "semana", "voto", "primicia", "primicias",
]);
// Cara de empresa: não é dízimo de uma pessoa.
const COMPANY = new Set(["ltda", "eireli", "mei", "sa", "comercio", "servicos", "banco", "pagamentos", "instituicao", "mercado", "supermercado"]);

const tokens = (s: string): string[] => normalizeText(s).replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
const nameTokens = (s: string): string[] => tokens(s).filter((t) => t.length > 1 && !SMALL.has(t));

export interface LineDonor {
  stickId: string | null; // pessoa cadastrada; null = só o nome do extrato
  name: string;
}

// Quem mandou o dinheiro, quando a linha é entrada e traz um nome. Primeiro procura uma
// pessoa cadastrada (primeiro e último nome batem, o banco abrevia o do meio); se não
// houver, devolve o nome do extrato. Nada de número, empresa conhecida ou palavra de culto.
export function donorFromLine(line: { amount: number; description: string }, people: { id: string; name: string }[]): LineDonor | null {
  if (line.amount <= 0) return null;
  const words = stripPrefix(tokens(line.description));
  if (words.some((w) => COMPANY.has(w))) return null;
  while (words.length > 0 && NOT_NAME.has(words[words.length - 1] ?? "")) words.pop();
  if (words.length < 2 || words.length > 6 || words.some((w) => NOT_NAME.has(w))) return null;

  const have = new Set(words);
  const found = people.filter((p) => {
    const t = nameTokens(p.name);
    const first = t[0];
    const last = t[t.length - 1];
    return t.length >= 2 && first && last && have.has(first) && have.has(last) && words[0] === first;
  });
  if (found.length === 1 && found[0]) return { stickId: found[0].id, name: found[0].name };
  if (found.length > 1) return null; // duas Marias Oliveira: a pessoa escolhe à mão

  const name = words.map((w) => (w.length === 1 ? `${w.toUpperCase()}.` : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  return { stickId: null, name };
}
