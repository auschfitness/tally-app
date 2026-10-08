// Sugestão de categoria no extrato (spec 11, fase C+). Sem IA: três fontes, em ordem de
// confiança, cada uma com o porquê em português para a pessoa confiar (DNA: contexto, não
// score). 1) regra que a pessoa mandou lembrar ("Sempre"); 2) o que ela já fez com o mesmo
// favorecido (valor parecido pesa mais); 3) empresas brasileiras conhecidas (Celesc é energia).
import { guessRulePattern, normalizeText, suggestCategory, type BankLine, type CategoryRule, type LedgerAccount } from "./domain";

export type SuggestionSource = "rule" | "history" | "known";

export interface Suggestion {
  accountId: string;
  source: SuggestionSource;
  reason: string; // "Sua regra: celesc", "Como em 05/09", "Celesc é energia"
  ruleId?: string;
}

// Linha já classificada antes: a memória que ensina sem a pessoa pedir.
export interface HistoryLine {
  description: string;
  amount: number;
  date: string;
  counterId: string;
}

const SIMILAR_AMOUNT = 0.1; // até 10% de diferença conta como "mesmo valor"

// Chave da regra/favorecido: as palavras que identificam ("cemig", "joao silva"). Sem nenhuma
// (descrição só com ruído de banco, ex. "TARIFA BANCARIA"), usa a descrição inteira sem números.
export function payeeKey(description: string): string {
  const guess = guessRulePattern(description);
  if (guess) return guess;
  return normalizeText(description).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

interface KnownPayee {
  words: string[];
  label: string; // como aparece no porquê: "<Nome> é energia"
  kind: string;
  code: string; // conta do plano padrão (m49)
  sign: "in" | "out";
}

// Empresas que toda igreja paga. Mapeiam para as contas do plano padrão; se a igreja renomeou
// ou apagou a conta, a sugestão simplesmente não aparece.
const KNOWN: KnownPayee[] = [
  ...["celesc", "cemig", "copel", "enel", "cpfl", "light", "coelba", "celpe", "cosern", "equatorial", "energisa", "neoenergia", "rge", "ceee", "eletropaulo", "amazonas energia", "edp"].map(
    (w) => ({ words: [w], label: w, kind: "energia", code: "5.1.03", sign: "out" as const }),
  ),
  ...["casan", "sabesp", "copasa", "sanepar", "cedae", "embasa", "compesa", "caesb", "cagece", "saneago", "corsan", "cesan", "aguas de", "samae", "semae", "daae", "saae"].map(
    (w) => ({ words: [w], label: w, kind: "água", code: "5.1.03", sign: "out" as const }),
  ),
  ...["vivo", "claro", "tim", "oi fibra", "telefonica", "net servicos", "sky", "algar", "brisanet", "desktop", "starlink"].map((w) => ({
    words: [w],
    label: w,
    kind: "telefone e internet",
    code: "5.1.03",
    sign: "out" as const,
  })),
  ...["tarifa", "cesta de servicos", "manutencao de conta", "iof", "pacote de servicos", "anuidade"].map((w) => ({
    words: [w],
    label: "tarifa do banco",
    kind: "tarifa do banco",
    code: "5.1.99",
    sign: "out" as const,
  })),
  { words: ["aluguel"], label: "aluguel", kind: "aluguel", code: "5.1.02", sign: "out" },
  { words: ["dizimo"], label: "dízimo", kind: "dízimo", code: "4.1.01", sign: "in" },
  { words: ["oferta"], label: "oferta", kind: "oferta", code: "4.1.02", sign: "in" },
];

const capitalize = (s: string): string => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function knownSuggestion(line: BankLine, accounts: LedgerAccount[]): Suggestion | null {
  const text = ` ${normalizeText(line.description).replace(/[^a-z0-9 ]/g, " ")} `;
  const sign = line.amount > 0 ? "in" : "out";
  for (const k of KNOWN) {
    if (k.sign !== sign || !k.words.some((w) => text.includes(` ${w} `))) continue;
    const account = accounts.find((a) => a.code === k.code && a.isActive);
    if (!account) continue;
    const reason = k.label === k.kind ? `Parece ${k.kind}` : `${capitalize(k.label)} é ${k.kind}`;
    return { accountId: account.id, source: "known", reason };
  }
  return null;
}

function historySuggestion(line: BankLine, history: HistoryLine[], accounts: LedgerAccount[]): Suggestion | null {
  const key = payeeKey(line.description);
  if (!key) return null;
  const sign = Math.sign(line.amount);
  const valid = new Set(accounts.filter((a) => a.isActive && a.type === (line.amount > 0 ? "revenue" : "expense")).map((a) => a.id));
  const same = history
    .filter((h) => Math.sign(h.amount) === sign && valid.has(h.counterId) && payeeKey(h.description) === key)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (same.length === 0) return null;
  const close = same.find((h) => Math.abs(Math.abs(h.amount) - Math.abs(line.amount)) <= Math.abs(h.amount) * SIMILAR_AMOUNT);
  const pick = close ?? same[0];
  if (!pick) return null;
  const day = `${pick.date.slice(8, 10)}/${pick.date.slice(5, 7)}`;
  return { accountId: pick.counterId, source: "history", reason: close ? `Como em ${day}, valor parecido` : `Como em ${day}` };
}

export function suggestFor(line: BankLine, rules: CategoryRule[], history: HistoryLine[], accounts: LedgerAccount[]): Suggestion | null {
  const ruleAccount = suggestCategory(line, rules, accounts);
  if (ruleAccount) {
    const text = normalizeText(line.description);
    const rule = rules
      .filter((r) => r.accountId === ruleAccount && text.includes(r.pattern))
      .sort((a, b) => b.pattern.length - a.pattern.length)[0];
    return { accountId: ruleAccount, source: "rule", reason: `Sua regra: ${rule?.pattern ?? ""}`, ruleId: rule?.id };
  }
  return historySuggestion(line, history, accounts) ?? knownSuggestion(line, accounts);
}
