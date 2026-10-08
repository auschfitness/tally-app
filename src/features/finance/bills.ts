// Contas a pagar e a receber (spec 12). Uma conta é uma promessa: não toca o livro até ser
// paga (pay_bill, m64). Funções puras sobre datas ISO (sem fuso) — testadas em bills.test.ts.

export type BillKind = "in" | "out";
export type BillFrequency = "weekly" | "monthly" | "yearly";
export type BillScope = "one" | "following" | "all";

export interface Bill {
  id: string;
  seriesId: string | null;
  seq: number | null;
  kind: BillKind;
  description: string;
  amount: number;
  dueDate: string;
  categoryId: string;
  accountId: string | null;
  payee: string;
  notes: string;
  status: "open" | "paid";
  paidOn: string | null;
  paidAmount: number | null;
  journalEntryId: string | null;
}

export interface BillSeries {
  id: string;
  frequency: BillFrequency;
  anchorDate: string;
  endsOn: string | null;
  nextSeq: number;
}

export const FREQUENCY_LABEL: Record<BillFrequency, string> = {
  weekly: "Toda semana",
  monthly: "Todo mês",
  yearly: "Todo ano",
};

// Ocorrências ficam materializadas até 12 meses à frente; ao abrir Finanças, a série que
// tem menos de 6 meses gerados é completada.
export const HORIZON_MONTHS = 12;
export const EXTEND_WHEN_MONTHS = 6;

const DAY_MS = 86_400_000;

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1];
}

function toIso(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  return toIso(Date.UTC(y, m, d) + days * DAY_MS);
}

// Soma meses mantendo o dia; se o mês não tem esse dia (31 em fevereiro), cai no último.
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const lastDay = new Date(Date.UTC(y, m + months + 1, 0)).getUTCDate();
  return toIso(Date.UTC(y, m + months, Math.min(d, lastDay)));
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  const [y1, m1, d1] = parts(fromIso);
  const [y2, m2, d2] = parts(toIsoDate);
  return Math.round((Date.UTC(y2, m2, d2) - Date.UTC(y1, m1, d1)) / DAY_MS);
}

// N-ésima ocorrência sempre a partir da âncora (não da anterior): 31/01 → 28/02 → 31/03.
export function occurrenceDate(anchor: string, frequency: BillFrequency, n: number): string {
  if (frequency === "weekly") return addDays(anchor, 7 * n);
  return addMonths(anchor, frequency === "yearly" ? 12 * n : n);
}

// Ocorrências ainda não geradas, até `until` e até o fim da série.
export function pendingOccurrences(series: BillSeries, until: string): { seq: number; dueDate: string }[] {
  const out: { seq: number; dueDate: string }[] = [];
  for (let seq = series.nextSeq; ; seq++) {
    const dueDate = occurrenceDate(series.anchorDate, series.frequency, seq);
    if (dueDate > until || (series.endsOn && dueDate > series.endsOn)) break;
    out.push({ seq, dueDate });
  }
  return out;
}

export function needsExtension(series: BillSeries, todayIso: string): boolean {
  const next = occurrenceDate(series.anchorDate, series.frequency, series.nextSeq);
  if (series.endsOn && next > series.endsOn) return false;
  return next <= addMonths(todayIso, EXTEND_WHEN_MONTHS);
}

// Contas que uma mudança alcança. Pagas nunca mudam.
export function billsInScope(bills: Bill[], target: Bill, scope: BillScope): Bill[] {
  if (scope === "one" || !target.seriesId) return target.status === "open" ? [target] : [];
  return bills.filter(
    (b) =>
      b.seriesId === target.seriesId &&
      b.status === "open" &&
      (scope === "all" || (b.seq ?? 0) >= (target.seq ?? 0)),
  );
}

// "Vence hoje", "Venceu há 3 dias", "Vence amanhã", "Vence 15/10".
export function dueLabel(due: string, todayIso: string): string {
  const d = daysBetween(todayIso, due);
  if (d === 0) return "Vence hoje";
  if (d === 1) return "Vence amanhã";
  if (d === -1) return "Venceu ontem";
  if (d < 0) return `Venceu há ${-d} dias`;
  const [, m, day] = parts(due);
  return `Vence ${String(day).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}`;
}

// Domingo que fecha a semana de `iso` (semana de segunda a domingo).
export function endOfWeek(iso: string): string {
  const [y, m, d] = parts(iso);
  const weekday = new Date(Date.UTC(y, m, d)).getUTCDay(); // 0 = domingo
  return addDays(iso, (7 - weekday) % 7);
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface BillGroup {
  key: string;
  label: string;
  items: Bill[];
}

// Abertas em grupos: Vencidas · Esta semana · Próxima semana · meses. Ordem por vencimento.
export function groupOpenBills(bills: Bill[], todayIso: string): BillGroup[] {
  const thisSunday = endOfWeek(todayIso);
  const nextSunday = addDays(thisSunday, 7);
  const [thisYear] = parts(todayIso);
  const groups = new Map<string, BillGroup>();
  const sorted = bills.filter((b) => b.status === "open").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const b of sorted) {
    let key: string;
    let label: string;
    if (b.dueDate < todayIso) [key, label] = ["overdue", "Vencidas"];
    else if (b.dueDate <= thisSunday) [key, label] = ["week", "Esta semana"];
    else if (b.dueDate <= nextSunday) [key, label] = ["next", "Próxima semana"];
    else {
      const [y, m] = parts(b.dueDate);
      key = b.dueDate.slice(0, 7);
      label = MONTHS[m] + (y === thisYear ? "" : ` de ${y}`);
    }
    const g = groups.get(key) ?? { key, label, items: [] };
    g.items.push(b);
    groups.set(key, g);
  }
  return [...groups.values()];
}

// "Esta semana" (Resolver): abertas vencidas + de hoje até domingo, vencidas primeiro.
export function weekBills(bills: Bill[], todayIso: string, kind?: BillKind): Bill[] {
  const sunday = endOfWeek(todayIso);
  return bills
    .filter((b) => b.status === "open" && b.dueDate <= sunday && (!kind || b.kind === kind))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description, "pt-BR"));
}

export interface WeekSummary {
  total: number;
  count: number;
  overdue: number;
}

export function weekSummary(bills: Bill[], todayIso: string, kind: BillKind): WeekSummary {
  const items = weekBills(bills, todayIso, kind);
  return {
    total: Math.round(items.reduce((s, b) => s + b.amount, 0) * 100) / 100,
    count: items.length,
    overdue: items.filter((b) => b.dueDate < todayIso).length,
  };
}

// Linha do extrato que parece ser uma conta aberta (spec 12, fase D): mesma direção, valor
// até 10% diferente do previsto e vencimento a até 5 dias da data do banco. Vence a mais
// parecida no valor, depois na data. `taken` evita oferecer a mesma conta a duas linhas.
export const MATCH_AMOUNT_TOLERANCE = 0.1;
export const MATCH_DAYS = 5;

export function findBillMatch(line: { date: string; amount: number }, bills: Bill[], taken: Set<string> = new Set()): Bill | null {
  const kind: BillKind = line.amount > 0 ? "in" : "out";
  const value = Math.abs(line.amount);
  const score = (b: Bill): [number, number] => [Math.abs(b.amount - value) / b.amount, Math.abs(daysBetween(b.dueDate, line.date))];
  const candidates = bills.filter((b) => {
    if (b.status !== "open" || b.kind !== kind || taken.has(b.id)) return false;
    const [diff, days] = score(b);
    return diff <= MATCH_AMOUNT_TOLERANCE + 1e-9 && days <= MATCH_DAYS;
  });
  return (
    candidates.sort((a, b) => {
      const [da, ta] = score(a);
      const [db, tb] = score(b);
      return da - db || ta - tb;
    })[0] ?? null
  );
}
