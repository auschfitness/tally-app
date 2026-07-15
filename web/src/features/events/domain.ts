// Domínio de Eventos. Regras portadas 1:1 de src/views/events.js + events-repo.js —
// só dado real, vazio honesto. Puro e testável.
import { brDate } from "@/lib/utils/date";
import type { EventItem, EventStatus } from "./types";

export const STATUS_LBL: Record<EventStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
};
export const STATUS_BAND: Record<EventStatus, string> = {
  draft: "attention",
  active: "healthy",
  completed: "healthy",
  cancelled: "risk",
};

// "14/07/2026 · 09:00–12:00" | "14/07/2026" | "sem data definida".
export function whenLabel(e: { event_date: string; start_time: string; end_time: string }): string {
  const parts: string[] = [];
  if (e.event_date) parts.push(brDate(e.event_date));
  if (e.start_time) parts.push(e.start_time + (e.end_time ? "–" + e.end_time : ""));
  return parts.join(" · ") || "sem data definida";
}

// Rótulo de vagas no card: " · 3/50" (com capacidade) | " · 3 inscritos" | "".
export function capacityLabel(count: number, capacity: number | null): string {
  if (capacity) return " · " + count + "/" + capacity;
  if (count) return " · " + count + " inscrito" + (count !== 1 ? "s" : "");
  return "";
}

// --- Data/hora: HH:MM ↔ timestamptz (portado de events-repo.js) ---
// Monta um ISO local de data (YYYY-MM-DD) + hora (HH:MM). Sem os dois → null.
export function tsFrom(date: string, time: string): string | null {
  if (!date || !time) return null;
  return date + "T" + time + ":00";
}
// Extrai "HH:MM" de um timestamptz. Sem valor → "".
export function timeOf(ts: string | null | undefined): string {
  if (!ts) return "";
  const m = /T(\d{2}:\d{2})/.exec(ts);
  return m ? m[1]! : "";
}

// Ordena eventos por data decrescente (sem data ao fim) — igual ao hydrate legado.
export function sortEvents(list: EventItem[]): EventItem[] {
  return list.slice().sort((a, b) => {
    if (!a.event_date && !b.event_date) return 0;
    if (!a.event_date) return 1;
    if (!b.event_date) return -1;
    return b.event_date.localeCompare(a.event_date);
  });
}
