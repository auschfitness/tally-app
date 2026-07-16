// Consultas da Agenda: NÃO toca tabelas diretamente. Reusa as queries já migradas de
// Services, Events e Teams (que já aplicam RLS, filtro de `archived` e resolução de
// `campus`) e apenas NORMALIZA num tipo comum de item. Ver docs/handoffs/calendar-supabase.md.
import type { DB } from "@/lib/auth/session";
import { listServices } from "@/features/services/queries";
import { listEvents } from "@/features/events/queries";
import { loadTeamsData } from "@/features/teams/queries";
import type { CalAssignment, CalendarSources, CalEvent, CalService } from "./types";

export async function loadCalendarSources(supabase: DB, orgId: string): Promise<CalendarSources> {
  const [services, events, teams] = await Promise.all([
    listServices(supabase, orgId),
    listEvents(supabase, orgId),
    loadTeamsData(supabase, orgId),
  ]);

  const svc: CalService[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    weekday: s.weekday,
    campus: s.campus,
    start_time: s.start_time,
    type: s.type,
    recurring_pattern: s.recurring_pattern,
    active: s.active,
  }));

  const evt: CalEvent[] = events.map((e) => ({
    id: e.id,
    name: e.name,
    event_date: e.event_date,
    campus: e.campus,
    start_time: e.start_time,
    type: e.type,
  }));

  // Escala: reusa schedule + nomes de time e de Stick (já sem arquivadas) do domínio Teams.
  const teamName = new Map(teams.teams.map((t) => [t.id, t.name]));
  const asg: CalAssignment[] = teams.schedule.map((a) => ({
    id: a.id,
    assignment_date: a.assignment_date,
    teamName: (a.team_id && teamName.get(a.team_id)) || "Escala",
    role: a.role,
    personName: (a.stick_id && teams.nameByStick.get(a.stick_id)) || "",
  }));

  return { services: svc, events: evt, assignments: asg };
}
