// Domínio Finance Lite. Regras portadas de derived.js (expenseByCat, financeMonthly,
// allFunds) e helpers (FINPAL). "Dados antes da UI" (DNA #2): aqui NÃO há mais o
// preenchimento ilustrativo de meses sem histórico — só somas reais dos lançamentos.
export type EntryType = "in" | "out";

export interface FinanceEntry {
  id: string;
  type: EntryType;
  desc: string;
  cat: string;
  fund: string;
  amount: number;
  date: string;
  campus: string;
}

// Paleta das despesas (mesma do app legado).
export const FINPAL = ["#2B5CE6", "#1FA97A", "#E8833A", "#EA5B4C", "#8b74e8", "#3E9AB0", "#B0663E", "#6B7688"];

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Despesas agregadas por categoria (só saídas), desc. expenseByCat de derived.js.
export function expenseByCat(entries: FinanceEntry[]): { cat: string; val: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "out") continue;
    m.set(e.cat, (m.get(e.cat) ?? 0) + e.amount);
  }
  return [...m.entries()].map(([cat, val]) => ({ cat, val })).sort((a, b) => b.val - a.val);
}

// Entradas/Saídas dos últimos 6 meses — SOMAS REAIS (sem números ilustrativos).
// Ver README: mudança consciente vs. o app legado, alinhada ao DNA #2.
export function financeMonthly(entries: FinanceEntry[], now: Date): { labels: string[]; inc: number[]; exp: number[] } {
  const months: string[] = [];
  const labels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"));
    labels.push(MONTHS_PT[dd.getMonth()]!);
  }
  const inc = new Array(6).fill(0) as number[];
  const exp = new Array(6).fill(0) as number[];
  for (const e of entries) {
    const idx = months.indexOf((e.date || "").slice(0, 7));
    if (idx < 0) continue;
    if (e.type === "in") inc[idx]! += e.amount;
    else exp[idx]! += e.amount;
  }
  return { labels, inc, exp };
}

// Saldo por fundo (entradas − saídas), só fundos com lançamentos. allFunds/saldo.
export function fundBalances(entries: FinanceEntry[]): { fund: string; balance: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    m.set(e.fund, (m.get(e.fund) ?? 0) + (e.type === "in" ? e.amount : -e.amount));
  }
  return [...m.entries()].filter(([f]) => f).map(([fund, balance]) => ({ fund, balance }));
}
