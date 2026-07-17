// Seleção de período reutilizável (Onda 2, Fatia A). Lógica PURA de datas — sem UI,
// sem estado — para ser testável e usável em qualquer tela de histórico/relatório.
// A UI vive em src/components/shared/PeriodFilter.tsx. Um intervalo é {from, to} em
// ISO (aaaa-mm-dd), ambos INCLUSIVOS; `null` = sem limite naquele lado (ex.: "Todo o
// período"). Datas já existem no banco (finance_entries.entry_date, attendance, etc.),
// então nada aqui toca schema.
import { brDate } from "./date";

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "7d"
  | "14d"
  | "thisMonth"
  | "lastMonth"
  | "3m"
  | "6m"
  | "12m"
  | "all"
  | "custom";

export interface PeriodRange {
  from: string | null; // ISO inclusivo; null = sem limite inferior
  to: string | null; // ISO inclusivo; null = sem limite superior
}

// O que o filtro entrega à tela: o preset escolhido + o intervalo já resolvido.
export interface PeriodValue extends PeriodRange {
  preset: PeriodPreset;
}

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "14d", label: "Últimos 14 dias" },
  { key: "thisMonth", label: "Este mês" },
  { key: "lastMonth", label: "Mês anterior" },
  { key: "3m", label: "Últimos 3 meses" },
  { key: "6m", label: "Últimos 6 meses" },
  { key: "12m", label: "Últimos 12 meses" },
  { key: "all", label: "Todo o período" },
  { key: "custom", label: "Personalizado" },
];

export function presetLabel(preset: PeriodPreset): string {
  return PERIOD_PRESETS.find((p) => p.key === preset)?.label ?? "";
}

// ISO a partir de componentes locais (mês 0-based), sem UTC — alinha ao calendário
// de quem está usando (o filtro roda no cliente).
function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isoOf(dt: Date): string {
  return iso(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

// Resolve um preset para um intervalo concreto, ancorado em `now` (data de referência,
// injetada para testabilidade). Para "custom", usa as datas informadas (ou null).
export function resolvePeriod(
  preset: PeriodPreset,
  now: Date,
  custom?: { from: string | null; to: string | null },
): PeriodRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const todayIso = iso(y, m, d);

  const shiftDays = (days: number): string => {
    const dt = new Date(y, m, d);
    dt.setDate(dt.getDate() + days);
    return isoOf(dt);
  };
  const shiftMonths = (months: number): string => {
    const dt = new Date(y, m, d);
    dt.setMonth(dt.getMonth() + months);
    return isoOf(dt);
  };

  switch (preset) {
    case "today":
      return { from: todayIso, to: todayIso };
    case "yesterday": {
      const yd = shiftDays(-1);
      return { from: yd, to: yd };
    }
    case "7d":
      return { from: shiftDays(-6), to: todayIso }; // 7 dias incluindo hoje
    case "14d":
      return { from: shiftDays(-13), to: todayIso };
    case "thisMonth": {
      const lastDay = new Date(y, m + 1, 0).getDate();
      return { from: iso(y, m, 1), to: iso(y, m, lastDay) };
    }
    case "lastMonth": {
      const lm = new Date(y, m - 1, 1);
      const ly = lm.getFullYear();
      const lmo = lm.getMonth();
      const lastDay = new Date(ly, lmo + 1, 0).getDate();
      return { from: iso(ly, lmo, 1), to: iso(ly, lmo, lastDay) };
    }
    case "3m":
      return { from: shiftMonths(-3), to: todayIso };
    case "6m":
      return { from: shiftMonths(-6), to: todayIso };
    case "12m":
      return { from: shiftMonths(-12), to: todayIso };
    case "all":
      return { from: null, to: null };
    case "custom":
      return { from: custom?.from ?? null, to: custom?.to ?? null };
  }
}

// Um valor ISO cai dentro do intervalo? Comparação lexicográfica de aaaa-mm-dd
// (funciona porque o formato é zero-padded e ordenável). `to` e `from` inclusivos.
export function inPeriod(dateIso: string | null | undefined, range: PeriodRange): boolean {
  if (!dateIso) return false;
  const d = dateIso.slice(0, 10);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

// Rótulo curto para o botão do filtro. Presets usam o nome; "custom" com datas mostra
// o intervalo (dd/mm/aaaa – dd/mm/aaaa) ou uma ponta só quando a outra está aberta.
export function periodButtonLabel(value: PeriodValue): string {
  if (value.preset !== "custom") return presetLabel(value.preset);
  const from = value.from ? brDate(value.from) : "";
  const to = value.to ? brDate(value.to) : "";
  if (from && to) return `${from} – ${to}`;
  if (from) return `A partir de ${from}`;
  if (to) return `Até ${to}`;
  return "Personalizado";
}
