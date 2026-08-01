// Coração contábil — LÓGICA PURA (sem I/O). Balancear um lançamento (espelha as
// regras de post_journal_entry no banco: ≥2 partidas, débitos=créditos, valor>0),
// montar a árvore do plano de contas por code/parent_id, e derivar a DRE do balancete.
// Testado forte em domain.test.ts — é o núcleo do módulo (dinheiro).
import type {
  Account,
  AccountGroup,
  AccountNode,
  AccountType,
  BalanceResult,
  DraftLine,
  IncomeStatement,
  TrialBalanceRow,
} from "./types";

// Centavos: contabilidade trabalha com 2 casas. Arredonda para evitar ruído de float.
export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const CENT = 0.005; // tolerância de meio centavo para comparar totais

// Ordem e rótulos PT-BR dos tipos de conta (ordem contábil clássica).
export const ACCOUNT_TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Ativo",
  liability: "Passivo",
  equity: "Patrimônio",
  revenue: "Receitas",
  expense: "Despesas",
};

export function accountTypeLabel(type: AccountType): string {
  return TYPE_LABELS[type] ?? type;
}

// Compara códigos de conta ("1.1.01") segmento a segmento, numericamente quando dá —
// assim "1.2" < "1.10" e leigos de zero-padding não bagunçam a ordem.
export function compareCode(a: string, b: string): number {
  const pa = a.split(".");
  const pb = b.split(".");
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const sa = pa[i] ?? "";
    const sb = pb[i] ?? "";
    const na = Number(sa);
    const nb = Number(sb);
    if (Number.isFinite(na) && Number.isFinite(nb) && sa !== "" && sb !== "") {
      if (na !== nb) return na - nb;
    } else if (sa !== sb) {
      return sa < sb ? -1 : 1;
    }
  }
  return 0;
}

// Monta a árvore do plano de contas a partir das linhas cruas. Usa parent_id como
// verdade; parent ausente (ou apontando para fora do conjunto) vira raiz. Cada grupo
// é um tipo, na ordem contábil; dentro do grupo, ordena por código.
export function buildAccountTree(accounts: Account[]): AccountGroup[] {
  const byId = new Map<string, AccountNode>();
  for (const a of accounts) byId.set(a.id, { ...a, depth: 0, children: [] });

  const roots: AccountNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  // Ordena filhos por código e fixa a profundidade em cascata.
  const sortRec = (node: AccountNode, depth: number) => {
    node.depth = depth;
    node.children.sort((x, y) => compareCode(x.code, y.code));
    for (const c of node.children) sortRec(c, depth + 1);
  };
  roots.sort((x, y) => compareCode(x.code, y.code));
  for (const r of roots) sortRec(r, 0);

  return ACCOUNT_TYPE_ORDER.map((type): AccountGroup => ({
    type,
    label: accountTypeLabel(type),
    roots: roots.filter((r) => r.type === type),
  })).filter((g) => g.roots.length > 0);
}

// Achata a árvore em uma lista ordenada (para selects/renders lineares), preservando
// a ordem hierárquica e a profundidade.
export function flattenTree(groups: AccountGroup[]): AccountNode[] {
  const out: AccountNode[] = [];
  const walk = (n: AccountNode) => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const g of groups) for (const r of g.roots) walk(r);
  return out;
}

// Uma partida é "de conteúdo" quando tem valor em exatamente um lado (>0).
function sideOf(line: DraftLine): "debit" | "credit" | "none" | "both" {
  const d = round2(line.debit) > 0;
  const c = round2(line.credit) > 0;
  if (d && c) return "both";
  if (d) return "debit";
  if (c) return "credit";
  return "none";
}

// Balanceia as partidas em edição: totais ao vivo + se pode postar + os motivos
// amigáveis quando não pode. Espelha o que o banco vai exigir em post_journal_entry,
// para o usuário não bater numa parede só ao clicar "Postar".
export function balanceEntry(lines: DraftLine[]): BalanceResult {
  let debitTotal = 0;
  let creditTotal = 0;
  let validLines = 0;
  let hasBothSides = false;
  let hasAmountNoAccount = false;
  let hasAccountNoAmount = false;

  for (const line of lines) {
    const side = sideOf(line);
    debitTotal += round2(line.debit) > 0 ? round2(line.debit) : 0;
    creditTotal += round2(line.credit) > 0 ? round2(line.credit) : 0;

    if (side === "both") hasBothSides = true;
    const hasAccount = Boolean(line.accountId);
    if (side === "none" && hasAccount) hasAccountNoAmount = true;
    if ((side === "debit" || side === "credit") && !hasAccount) hasAmountNoAccount = true;
    if ((side === "debit" || side === "credit") && hasAccount) validLines++;
  }

  debitTotal = round2(debitTotal);
  creditTotal = round2(creditTotal);
  const difference = round2(debitTotal - creditTotal);
  const balanced = Math.abs(difference) < CENT;
  const positive = debitTotal > CENT;

  const errors: string[] = [];
  if (hasBothSides) errors.push("Cada partida tem um lado só: débito OU crédito.");
  if (hasAmountNoAccount) errors.push("Escolha a conta de cada partida com valor.");
  if (hasAccountNoAmount) errors.push("Informe o valor de cada partida.");
  if (validLines < 2) errors.push("Um lançamento precisa de ao menos 2 partidas.");
  if (!positive) errors.push("O valor do lançamento não pode ser zero.");
  else if (!balanced) errors.push("Os débitos e os créditos precisam bater.");

  return {
    debitTotal,
    creditTotal,
    difference,
    balanced,
    lineCount: validLines,
    positive,
    canPost: errors.length === 0,
    errors,
  };
}

// Deriva a DRE simples do balancete: receitas − despesas. Cada partida contribui a
// exatamente uma conta, então somar os saldos por tipo não duplica (contas-pai, sem
// partidas diretas, entram com saldo 0). Mostra só contas com movimento.
export function buildIncomeStatement(rows: TrialBalanceRow[]): IncomeStatement {
  const hasActivity = (r: TrialBalanceRow) => round2(r.debit) !== 0 || round2(r.credit) !== 0;
  const revenueRows = rows.filter((r) => r.type === "revenue" && hasActivity(r)).sort((a, b) => compareCode(a.code, b.code));
  const expenseRows = rows.filter((r) => r.type === "expense" && hasActivity(r)).sort((a, b) => compareCode(a.code, b.code));
  const revenue = round2(revenueRows.reduce((s, r) => s + (Number(r.balance) || 0), 0));
  const expense = round2(expenseRows.reduce((s, r) => s + (Number(r.balance) || 0), 0));
  return { revenue, expense, result: round2(revenue - expense), revenueRows, expenseRows };
}

// Totais de débito/crédito de um conjunto de partidas persistidas (para a lista).
export function sumSides(lines: { debit: number; credit: number }[]): { debit: number; credit: number } {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    debit += Number(l.debit) || 0;
    credit += Number(l.credit) || 0;
  }
  return { debit: round2(debit), credit: round2(credit) };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  posted: "Postado",
  void: "Anulado",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// Traduz as mensagens cruas do banco (m48, minúsculas/sem acento) para algo amigável.
// Mantém o texto original quando não reconhece (o toMessage já não vaza detalhe técnico).
export function friendlyAccountingError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("nao batem") || m.includes("não batem")) return "Os débitos e os créditos não batem. Ajuste as partidas.";
  if (m.includes("2 partidas")) return "Um lançamento precisa de ao menos 2 partidas.";
  if (m.includes("valor zero")) return "O valor do lançamento não pode ser zero.";
  if (m.includes("so rascunho") || m.includes("só rascunho")) return "Só um rascunho pode ser postado.";
  if (m.includes("postado pode ser anulado")) return "Só um lançamento postado pode ser estornado.";
  if (m.includes("imutavel") || m.includes("imutável")) return "Lançamento postado é imutável. Estorne para corrigir.";
  if (m.includes("one_side") || m.includes("one side")) return "Cada partida tem um lado só: débito OU crédito.";
  if (m === "forbidden" || m.includes("forbidden") || m.includes("row-level security")) return "Você não tem permissão para esta ação.";
  return raw;
}
