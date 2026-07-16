// Modelos da feature Agenda/Calendário. NÃO tem tabela própria: é uma AGREGAÇÃO de
// leitura no app, reusando as queries de Services, Events e Teams. Ver
// docs/handoffs/calendar-supabase.md. Só dado real — nada de evento inventado.

export type CalKind = "service" | "event" | "assignment";

// Item comum da timeline (normalização das três fontes).
export interface CalItem {
  date: string; // YYYY-MM-DD
  kind: CalKind;
  title: string;
  sub: string;
  ref: string; // id da fonte (para abrir /services/[id], /events/[id], /teams/schedule)
}

// --- Projeções normalizadas das fontes (o mínimo que a agregação precisa) ---
export interface CalService {
  id: string;
  name: string;
  weekday: number | null;
  campus: string;
  start_time: string;
  type: string;
  recurring_pattern: "weekly" | "monthly" | "custom";
  active: boolean;
}
export interface CalEvent {
  id: string;
  name: string;
  event_date: string;
  campus: string;
  start_time: string;
  type: string;
}
export interface CalAssignment {
  id: string;
  assignment_date: string;
  teamName: string;
  role: string;
  personName: string;
}

export interface CalendarSources {
  services: CalService[];
  events: CalEvent[];
  assignments: CalAssignment[];
}
