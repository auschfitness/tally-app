// Assembler do Inbox: monta o `SignalsInput` do engine a partir das queries já
// migradas (REUSO cross-feature só-leitura — nada de tabela nova) + partes sob
// medida (todas as sessões de presença, milestones por Stick, inscrições, overrides).
// O cálculo dos Signals é do engine puro; aqui só reunimos as fontes.
//
// FONTE (confirmada no legado + handoff): Inbox = engine ao vivo + `signal_overrides`
// (status por signal_key). A tabela `signals` NÃO é lida. Ver
// docs/handoffs/inbox-supabase.md.
import type { DB } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { listGroups } from "@/features/groups/queries";
import { groupsHealth } from "@/features/groups/domain";
import { listTasks } from "@/features/coordination/queries";
import { loadTeamsData } from "@/features/teams/queries";
import { listServices } from "@/features/services/queries";
import { listEvents } from "@/features/events/queries";
import type {
  ChurchEvent,
  EventRegistration,
  Milestone,
  Service as SignalService,
  Session,
  SignalPerson,
  SignalsInput,
} from "@/features/signals/domain";
import type { InboxStatus, OverridesMap } from "./types";

// Todas as sessões de presença (service+group) com presentes. Grupo vira NOME
// (o engine casa por g.name); culto fica como ID (o engine casa por s.id).
async function allSessions(supabase: DB, orgId: string, groupNameById: Map<string, string>): Promise<Session[]> {
  const sessRes = await supabase
    .from("attendance_sessions")
    .select("id, context_type, context_id, session_date")
    .eq("org_id", orgId)
    .in("context_type", ["service", "group"]);
  const sessions = sessRes.data ?? [];
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const recRes = await supabase.from("attendance_records").select("session_id, stick_id").in("session_id", ids).eq("status", "present");
  const bySession = new Map<string, string[]>();
  for (const r of recRes.data ?? []) (bySession.get(r.session_id) ?? bySession.set(r.session_id, []).get(r.session_id)!).push(r.stick_id);
  return sessions.map((s) => ({
    service: s.context_type === "service" ? s.context_id : null,
    group: s.context_type === "group" && s.context_id ? groupNameById.get(s.context_id) ?? null : null,
    date: s.session_date ?? "",
    attendees: bySession.get(s.id) ?? [],
  }));
}

// Milestones por Stick (para as celebrações do feed). FONTE = tabela relacional
// `milestones` (Journey/Trilhas gravam nela) — não mais o blob. type = code
// (fallback via milestone_type_id → milestone_types.code); date = occurred_on.
async function milestonesByStick(supabase: DB, orgId: string): Promise<Map<string, Milestone[]>> {
  const [msRes, typesRes] = await Promise.all([
    supabase.from("milestones").select("stick_id, code, milestone_type_id, occurred_on").eq("org_id", orgId),
    supabase.from("milestone_types").select("id, code").eq("org_id", orgId),
  ]);
  const codeByType = new Map<string, string>();
  for (const t of typesRes.data ?? []) if (t.code) codeByType.set(t.id, t.code);
  const map = new Map<string, Milestone[]>();
  for (const m of msRes.data ?? []) {
    const type = m.code ?? (m.milestone_type_id ? codeByType.get(m.milestone_type_id) : null);
    if (!type || !m.occurred_on) continue;
    (map.get(m.stick_id) ?? map.set(m.stick_id, []).get(m.stick_id)!).push({ type, date: m.occurred_on });
  }
  return map;
}

// Inscrições de evento achatadas ({event_id}) — o engine conta por filtro.
async function eventRegsFlat(supabase: DB, orgId: string): Promise<EventRegistration[]> {
  const res = await supabase.from("event_registrations").select("event_id").eq("org_id", orgId);
  return (res.data ?? []).map((r) => ({ event_id: r.event_id }));
}

// Status por signal (signal_overrides). UNIQUE(org_id, signal_key). Texto livre.
export async function loadOverrides(supabase: DB, orgId: string): Promise<OverridesMap> {
  const res = await supabase.from("signal_overrides").select("signal_key, status").eq("org_id", orgId);
  const map: OverridesMap = new Map();
  for (const r of res.data ?? []) if (r.signal_key) map.set(r.signal_key, (r.status ?? "new") as InboxStatus);
  return map;
}

// Monta o SignalsInput completo para o campus ativo (reuso das queries de feature).
export async function buildSignalsInput(supabase: DB, orgId: string, activeCampus: string): Promise<SignalsInput> {
  const [people, groups, tasks, teamsData, services, events, eventRegs] = await Promise.all([
    listSticks(supabase, orgId),
    listGroups(supabase, orgId),
    listTasks(supabase, orgId),
    loadTeamsData(supabase, orgId),
    listServices(supabase, orgId),
    listEvents(supabase, orgId),
    eventRegsFlat(supabase, orgId),
  ]);

  const groupNameById = new Map<string, string>();
  for (const g of groups) groupNameById.set(g.id, g.name);

  const [sessions, msByStick] = await Promise.all([allSessions(supabase, orgId, groupNameById), milestonesByStick(supabase, orgId)]);

  const signalPeople: SignalPerson[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    relationship: p.relationship,
    campus: p.campus,
    lastSeen: p.lastSeen,
    group: p.group,
    followup: p.followup,
  }));

  const signalServices: SignalService[] = services.map((s) => ({ id: s.id, name: s.name, active: s.active, campus: s.campus }));
  const churchEvents: ChurchEvent[] = events.map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
    event_date: e.event_date,
    campus: e.campus,
    capacity: e.capacity,
  }));

  return {
    people: signalPeople,
    milestonesByStick: msByStick,
    groupsHealth: groupsHealth(people, groups, activeCampus),
    sessions,
    tasks,
    teams: teamsData.teams,
    teamMembers: teamsData.members,
    schedule: teamsData.schedule,
    services: signalServices,
    events: churchEvents,
    eventRegs,
    activeCampus,
  };
}
