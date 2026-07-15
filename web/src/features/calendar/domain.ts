// Domínio da Agenda. Projeta as três fontes numa timeline por data, dentro de um
// intervalo [from, to]. Portado 1:1 de src/views/calendar.js (occurrences). Puro e
// determinístico (recebe as fontes + o intervalo como Dates) — sem estado global.
import type { CalItem, CalKind, CalendarSources } from "./types";

export const WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const KIND_LBL: Record<CalKind, string> = { service: "Culto", event: "Evento", assignment: "Escala" };
export const KIND_COLOR: Record<CalKind, string> = { service: "var(--blue)", event: "#8b74e8", assignment: "var(--green)" };

// --- Helpers de data (puros) ---
export function parseIso(s: string): Date {
  const p = (s || "").split("-");
  return new Date(+p[0]!, +p[1]! - 1, +p[2]!);
}
export function ymd(d: Date): string {
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}
export function firstWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const d = new Date(year, month, 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}

function inCampusItem(campus: string, activeCampus: string): boolean {
  return !campus || campus === activeCampus;
}
// "09:00 · Domingo" | "09:00" | "Domingo" | "" — igual ao legado.
function subOf(startTime: string, type: string): string {
  return (startTime || "") + (type ? (startTime ? " · " : "") + type : "");
}

// Ocorrências dentro de [from, to] (Dates), respeitando campus e o filtro de tipo
// (null = tudo). Cultos são projetados pela recorrência (weekday); custom não entra
// na grade. Eventos e escalas entram pela data real. Ordenado por data, depois título.
export function occurrences(
  from: Date,
  to: Date,
  sources: CalendarSources,
  activeCampus: string,
  typeFilter: CalKind | null,
): CalItem[] {
  const out: CalItem[] = [];
  const fromIso = ymd(from);
  const toIso = ymd(to);

  if (!typeFilter || typeFilter === "event") {
    for (const e of sources.events) {
      if (!inCampusItem(e.campus, activeCampus) || !e.event_date) continue;
      if (e.event_date < fromIso || e.event_date > toIso) continue;
      out.push({ date: e.event_date, kind: "event", title: e.name || "(sem nome)", sub: subOf(e.start_time, e.type), ref: e.id });
    }
  }

  if (!typeFilter || typeFilter === "service") {
    for (const s of sources.services) {
      if (!s.active || !inCampusItem(s.campus, activeCampus) || s.weekday == null) continue;
      if (s.recurring_pattern === "custom") continue; // custom não é projetado na grade
      const sub = subOf(s.start_time, s.type);
      if (s.recurring_pattern === "monthly") {
        // 1ª ocorrência do weekday em cada mês do range
        let d = new Date(from.getFullYear(), from.getMonth(), 1);
        while (d <= to) {
          const occ = firstWeekdayOfMonth(d.getFullYear(), d.getMonth(), s.weekday);
          if (occ >= from && occ <= to) out.push({ date: ymd(occ), kind: "service", title: s.name || "(sem nome)", sub, ref: s.id });
          d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        }
      } else {
        // weekly
        let cur = new Date(from);
        while (cur <= to) {
          if (cur.getDay() === s.weekday) out.push({ date: ymd(cur), kind: "service", title: s.name || "(sem nome)", sub, ref: s.id });
          cur = addDays(cur, 1);
        }
      }
    }
  }

  if (!typeFilter || typeFilter === "assignment") {
    for (const a of sources.assignments) {
      if (!a.assignment_date || a.assignment_date < fromIso || a.assignment_date > toIso) continue;
      out.push({
        date: a.assignment_date,
        kind: "assignment",
        title: a.teamName || "Escala",
        sub: [a.role, a.personName].filter(Boolean).join(" · "),
        ref: a.id,
      });
    }
  }

  out.sort((x, y) => x.date.localeCompare(y.date) || (x.title || "").localeCompare(y.title || ""));
  return out;
}

// Agrupa itens por dia (chave YYYY-MM-DD), preservando a ordem de `occurrences`.
export function groupByDay(items: CalItem[]): Map<string, CalItem[]> {
  const byDay = new Map<string, CalItem[]>();
  for (const it of items) (byDay.get(it.date) ?? byDay.set(it.date, []).get(it.date)!).push(it);
  return byDay;
}

// Rótulo do período (semana ou mês) a partir do anchor.
export function periodLabel(anchor: Date, view: "week" | "month"): string {
  if (view === "month") return MONTHS[anchor.getMonth()] + " " + anchor.getFullYear();
  const ws = startOfWeek(anchor);
  const we = addDays(ws, 6);
  return ymd(ws).split("-").reverse().join("/").slice(0, 5) + " – " + ymd(we).split("-").reverse().join("/").slice(0, 5);
}
