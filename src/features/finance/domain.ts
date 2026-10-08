// Domínio de Finanças (spec 10). O livro de partidas dobradas (m48) é a fonte da verdade;
// aqui traduzimos partidas em linguagem de tesoureiro: entrada, saída, transferência e
// saldo por conta. Funções puras — testadas em domain.test.ts.
import type { AccountType, EntryStatus } from "@/features/accounting/types";

export type TxKind = "in" | "out" | "transfer";
// "other" = lançamento manual do contador que não cabe nos três tipos simples.
export type MovementKind = TxKind | "other";

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
}

export interface LedgerLine {
  entryId: string;
  accountId: string;
  debit: number;
  credit: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  memo: string;
  status: EntryStatus;
  fundId: string | null;
}

export interface Movement {
  id: string;
  date: string;
  memo: string;
  kind: MovementKind;
  amount: number;
  status: EntryStatus;
  accountId: string | null; // conta (banco/caixa); na transferência, a origem
  counterId: string | null; // categoria; na transferência, o destino
  donor: string;
}

export interface AccountBalance {
  id: string;
  name: string;
  balance: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Contas finais (sem filhas) e ativas de um tipo, na ordem do plano.
export function leafAccounts(accounts: LedgerAccount[], type: AccountType): LedgerAccount[] {
  const parents = new Set(accounts.map((a) => a.parentId).filter(Boolean));
  return accounts
    .filter((a) => a.type === type && a.isActive && !parents.has(a.id))
    .sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
}

// Traduz um lançamento de 2 partidas em entrada/saída/transferência. Qualquer outra forma
// (várias partidas, contas fora do caixa) vira "other" e soma o lado débito.
export function toMovement(entry: LedgerEntry, lines: LedgerLine[], typeOf: Map<string, AccountType>, donor = ""): Movement {
  const base = { id: entry.id, date: entry.date, memo: entry.memo, status: entry.status, donor };
  const amount = round2(lines.reduce((s, l) => s + l.debit, 0));
  const d = lines.find((l) => l.debit > 0);
  const c = lines.find((l) => l.credit > 0);
  if (lines.length === 2 && d && c) {
    const dt = typeOf.get(d.accountId);
    const ct = typeOf.get(c.accountId);
    if (dt === "asset" && ct === "revenue") return { ...base, kind: "in", amount, accountId: d.accountId, counterId: c.accountId };
    if (dt === "expense" && ct === "asset") return { ...base, kind: "out", amount, accountId: c.accountId, counterId: d.accountId };
    if (dt === "asset" && ct === "asset") return { ...base, kind: "transfer", amount, accountId: c.accountId, counterId: d.accountId };
  }
  return { ...base, kind: "other", amount, accountId: null, counterId: null };
}

// Saldo de cada conta de caixa/banco: débitos − créditos das partidas de lançamentos
// postados. Contas sem movimento aparecem com zero (a igreja vê todas as suas contas).
export function accountBalances(
  accounts: LedgerAccount[],
  entries: LedgerEntry[],
  lines: LedgerLine[],
  asOf: string | null = null,
): AccountBalance[] {
  const posted = new Set(entries.filter((e) => e.status === "posted" && (!asOf || e.date <= asOf)).map((e) => e.id));
  const sum = new Map<string, number>();
  for (const l of lines) {
    if (!posted.has(l.entryId)) continue;
    sum.set(l.accountId, (sum.get(l.accountId) ?? 0) + l.debit - l.credit);
  }
  return leafAccounts(accounts, "asset").map((a) => ({ id: a.id, name: a.name, balance: round2(sum.get(a.id) ?? 0) }));
}

// Movimentos agrupados por dia (mais recente primeiro), para o extrato.
export function groupByDay(movements: Movement[]): { date: string; items: Movement[] }[] {
  const sorted = [...movements].sort((a, b) => b.date.localeCompare(a.date));
  const out: { date: string; items: Movement[] }[] = [];
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && last.date === m.date) last.items.push(m);
    else out.push({ date: m.date, items: [m] });
  }
  return out;
}

// Próximo código livre sob um grupo do plano ("4.1" → "4.1.04"). Pega o menor sufixo
// não usado, com 2 dígitos — o padrão do plano semeado (m49).
export function nextChildCode(accounts: LedgerAccount[], parentCode: string): string {
  const used = new Set(
    accounts
      .filter((a) => a.code.startsWith(parentCode + ".") && !a.code.slice(parentCode.length + 1).includes("."))
      .map((a) => Number(a.code.slice(parentCode.length + 1))),
  );
  let n = 1;
  while (used.has(n)) n++;
  return `${parentCode}.${String(n).padStart(2, "0")}`;
}

// Grupo do plano onde nasce uma conta nova criada pelo tesoureiro.
export const PARENT_CODE: Record<TxKind, string> = { in: "4.1", out: "5.1", transfer: "1.1" };

// Categorias que pedem "De quem?" (viram doação ligada ao lançamento).
export function isGivingCategory(name: string): boolean {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return n.includes("dizimo") || n.includes("oferta") || n.includes("doac");
}

// Mensagens cruas do banco (m48/m61) → texto de tesoureiro.
export function friendlyFinanceError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("forbidden") || m.includes("row-level security")) return "Você não tem permissão para mexer nas finanças.";
  if (m.includes("valor zero")) return "O valor precisa ser maior que zero.";
  if (m.includes("origem e destino")) return "A conta de origem e a de destino precisam ser diferentes.";
  if (m.includes("nao combina")) return "Essa categoria não combina com o tipo do lançamento.";
  if (m.includes("conta final")) return "Escolha uma conta específica, não um grupo.";
  if (m.includes("inexistente")) return "Não encontrei a conta, o fundo ou a pessoa escolhida. Recarregue a página.";
  if (m.includes("postado pode ser anulado")) return "Esse lançamento já foi anulado.";
  return raw;
}

export interface CategoryTotal {
  id: string;
  total: number;
}

export interface MonthClose {
  month: string; // aaaa-mm
  opening: number;
  income: number;
  expense: number;
  other: number; // lançamentos do contador que mexeram no caixa fora de entrada/saída
  closing: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  accounts: { id: string; name: string; opening: number; closing: number }[];
}

// Último dia do mês anterior e último dia do mês ("2026-10" → "2026-09-30", "2026-10-31").
export function monthBounds(month: string): { before: string; last: string } {
  const [y, m] = month.split("-").map(Number);
  const iso = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { before: iso(new Date(y ?? 0, (m ?? 1) - 1, 0)), last: iso(new Date(y ?? 0, m ?? 1, 0)) };
}

function totalsBy(movements: Movement[]): CategoryTotal[] {
  const m = new Map<string, number>();
  for (const mv of movements) if (mv.counterId) m.set(mv.counterId, (m.get(mv.counterId) ?? 0) + mv.amount);
  return [...m.entries()].map(([id, total]) => ({ id, total: round2(total) })).sort((a, b) => b.total - a.total);
}

// Fechamento do mês em linguagem de tesoureiro. Saldos vêm do livro (exatos); entradas e
// saídas vêm dos movimentos do mês. O que sobra (ajuste manual do contador no caixa)
// aparece como "outros" para a conta fechar: inicial + entradas − saídas + outros = final.
export function monthClose(
  month: string,
  accounts: LedgerAccount[],
  entries: LedgerEntry[],
  lines: LedgerLine[],
  movements: Movement[],
): MonthClose {
  const { before, last } = monthBounds(month);
  const openingByAcc = accountBalances(accounts, entries, lines, before);
  const closingByAcc = accountBalances(accounts, entries, lines, last);
  const inMonth = movements.filter((m) => m.status === "posted" && m.date.slice(0, 7) === month);
  const ins = inMonth.filter((m) => m.kind === "in");
  const outs = inMonth.filter((m) => m.kind === "out");

  const opening = round2(openingByAcc.reduce((s, a) => s + a.balance, 0));
  const closing = round2(closingByAcc.reduce((s, a) => s + a.balance, 0));
  const income = round2(ins.reduce((s, m) => s + m.amount, 0));
  const expense = round2(outs.reduce((s, m) => s + m.amount, 0));

  return {
    month,
    opening,
    income,
    expense,
    other: round2(closing - opening - income + expense),
    closing,
    incomeByCategory: totalsBy(ins),
    expenseByCategory: totalsBy(outs),
    accounts: closingByAcc.map((a) => ({
      id: a.id,
      name: a.name,
      opening: openingByAcc.find((o) => o.id === a.id)?.balance ?? 0,
      closing: a.balance,
    })),
  };
}
