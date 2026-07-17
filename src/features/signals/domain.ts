// Motor de Signals — o coração do "um pastor vê o um" (DNA #1/#3). Deriva
// Signals (contexto/oportunidade, NUNCA score) a partir de fontes já existentes:
// pessoas, saúde de grupos, tarefas, times/escala, cultos/sessões e eventos.
//
// Portado 1:1 de src/core/derived.js (`signals`, `serviceSignals`,
// `serviceEventSignals`). É PURO e determinístico: recebe os dados e o `now`
// como parâmetros (nada de `today()`/estado global), para poder ser testado em
// unidade e reusado por Care, Inbox e Home. As queries de cada feature (Teams/
// Services/Events) fornecem coleções já no formato das interfaces daqui — é a
// "interface limpa" entre features exigida pelo playbook.
import type { GroupHealth } from "@/features/groups/domain";
import { isVisitor, type Relationship } from "@/features/sticks/domain";
import { isoDate } from "@/lib/utils/date";

// --- Saída ---
export type SignalLevel = "attention" | "notice" | "celebration";
export type SignalCategory = "Care" | "Journey" | "Celebration" | "Groups" | "Teams" | "Services";

// Um Signal é um item do feed pastoral. Campos opcionais aparecem só quando o
// sinal é sobre uma Stick (stickId/stickName) ou um grupo (groupName).
export interface Signal {
  key: string;
  type: string;
  level: SignalLevel;
  title: string;
  why: string[];
  date: string;
  category: SignalCategory;
  stickId?: string;
  stickName?: string;
  groupName?: string;
}

// --- Entradas (formato mínimo que o motor consome) ---
// Pessoa como o motor a enxerga. É um subconjunto de features/sticks Person +
// os milestones (que ainda vivem no app_state e chegam à parte via mapa).
export interface SignalPerson {
  id: string;
  name: string;
  relationship: Relationship;
  campus: string;
  lastSeen: string | null;
  group: string;
  followup: boolean;
}

export interface Milestone {
  type: string;
  date: string;
}

export interface Session {
  service?: string | null;
  group?: string | null;
  date: string;
  attendees: string[];
}

export interface Task {
  id: string;
  done: boolean;
  who: string;
  text: string;
}

export interface Team {
  id: string;
  name: string;
  status: string;
  campus?: string | null;
  leader_id?: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  stick_id: string;
  status: string;
  joined_at?: string | null;
}

export interface ScheduleAssignment {
  stick_id?: string | null;
  assignment_date?: string | null;
  status?: string | null;
}

export interface Service {
  id: string;
  name: string;
  active?: boolean;
  campus?: string | null;
}

export interface ChurchEvent {
  id: string;
  name: string;
  status: string;
  event_date?: string | null;
  campus?: string | null;
  capacity?: number | null;
}

export interface EventRegistration {
  event_id: string;
}

// Rótulos de milestone (PT-BR). Portado de MSTYPE (helpers.js). Fica aqui, no
// primeiro consumidor; pode subir para um módulo compartilhado quando Care/Home
// também precisarem.
export const MSTYPE: Record<string, string> = {
  first_visit: "Primeira visita",
  second_visit: "Segunda visita",
  conversion: "Conversão",
  baptism: "Batismo",
  joined_group: "Entrou em um grupo",
  started_serving: "Começou a servir",
  completed_track: "Concluiu trilha",
  membership: "Tornou-se membro",
  leadership: "Tornou-se líder",
  returned: "Retornou após ausência",
  prayer_answered: "Oração respondida",
};

const DAY = 1000 * 60 * 60 * 24;
const WEEK = 7 * DAY;
// Semanas sem aparecer a partir das quais a pessoa vira sinal de atenção.
// Fixo em 3 no legado (signals()), independente de state.careWeeks — preservado.
const ATTENTION_WEEKS = 3;

function daysBetween(now: Date, iso: string): number {
  return Math.round((now.getTime() - new Date(iso).getTime()) / DAY);
}
function weeksSinceOn(now: Date, iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY / 7);
}
function inCampus(campus: string | null | undefined, activeCampus: string): boolean {
  return campus === activeCampus;
}
// Rótulo do grupo nos títulos de sinal: não duplica "Grupo" quando o próprio nome
// já começa com ele (evita "Grupo Grupo de Jovens").
function groupLabel(name: string): string {
  return /^grupo\b/i.test(name.trim()) ? name : "Grupo " + name;
}

// --- Signals de pessoas + milestones (por Stick do campus ativo) ---
export function peopleSignals(
  people: SignalPerson[],
  milestonesByStick: Map<string, Milestone[]>,
  activeCampus: string,
  now: Date,
): Signal[] {
  const out: Signal[] = [];
  const nowIso = isoDate(now);
  for (const p of people) {
    if (!inCampus(p.campus, activeCampus)) continue;
    const w = weeksSinceOn(now, p.lastSeen);
    if (w >= ATTENTION_WEEKS) {
      out.push({
        key: "att-" + p.id,
        type: "attendance",
        level: "attention",
        stickId: p.id,
        stickName: p.name,
        title: p.name + " pode precisar de atenção",
        why: ["Sem aparecer há " + w + " semanas"]
          .concat(!p.group ? ["Não está em um grupo"] : [])
          .concat(p.followup ? ["Follow-up em aberto"] : []),
        date: nowIso,
        category: "Care",
      });
    } else if (!p.group && isVisitor(p.relationship)) {
      out.push({
        key: "grp-" + p.id,
        type: "journey",
        level: "notice",
        stickId: p.id,
        stickName: p.name,
        title: p.name + " ainda não entrou em um grupo",
        why: ["Visitante sem grupo"],
        date: nowIso,
        category: "Journey",
      });
    } else if (p.followup) {
      out.push({
        key: "fu-" + p.id,
        type: "care",
        level: "attention",
        stickId: p.id,
        stickName: p.name,
        title: p.name + " tem follow-up em aberto",
        why: ["Follow-up pendente"],
        date: nowIso,
        category: "Care",
      });
    }
    // Milestones recentes (0..21 dias) viram celebração — roda para toda pessoa,
    // independente do if/else acima (paridade com derived.js).
    for (const m of milestonesByStick.get(p.id) ?? []) {
      const dd = daysBetween(now, m.date);
      if (dd >= 0 && dd <= 21) {
        out.push({
          key: "ms-" + p.id + "-" + m.type,
          type: "milestone",
          level: "celebration",
          stickId: p.id,
          stickName: p.name,
          title: p.name + " · " + (MSTYPE[m.type] ?? m.type),
          why: [],
          date: m.date,
          category: "Celebration",
        });
      }
    }
  }
  return out;
}

// --- Signals de saúde de grupos (recebe a saúde já computada por groups/domain) ---
export function groupHealthSignals(health: GroupHealth[], sessions: Session[], now: Date): Signal[] {
  const out: Signal[] = [];
  const nowIso = isoDate(now);
  for (const g of health) {
    if (g.band === "risk") {
      out.push({
        key: "gh-" + g.name,
        type: "group_health",
        level: "attention",
        groupName: g.name,
        title: groupLabel(g.name) + " com saúde baixa",
        why: [g.rate + "% dos membros em dia"],
        date: nowIso,
        category: "Groups",
      });
    }
    if (g.noLeader) {
      out.push({
        key: "gl-" + g.name,
        type: "group_leader",
        level: "notice",
        groupName: g.name,
        title: groupLabel(g.name) + " sem líder atribuído",
        why: ["Nenhum líder definido"],
        date: nowIso,
        category: "Groups",
      });
    }
    if (g.newMembers > 0) {
      const plural = g.newMembers > 1;
      out.push({
        key: "gn-" + g.name,
        type: "group_growth",
        level: "celebration",
        groupName: g.name,
        title: groupLabel(g.name) + " recebeu " + g.newMembers + " novo" + (plural ? "s" : "") + " membro" + (plural ? "s" : ""),
        why: [],
        date: nowIso,
        category: "Groups",
      });
    }
    if (g.leftRecently > 0) {
      const plural = g.leftRecently > 1;
      out.push({
        key: "gx-" + g.name,
        type: "group_movement",
        level: "attention",
        groupName: g.name,
        title: groupLabel(g.name) + ": " + g.leftRecently + " saída" + (plural ? "s" : "") + " recente" + (plural ? "s" : ""),
        why: [],
        date: nowIso,
        category: "Groups",
      });
    }
    // Presença: só grupo que JÁ registrou presença mas parou (>21 dias). Grupo
    // que nunca registrou não é sinalizado (evita flood e número inventado).
    const gss = sessions.filter((s) => s.group === g.name);
    if (gss.length > 0) {
      const last = gss.map((s) => s.date || "").sort().pop()!;
      const dd = daysBetween(now, last);
      if (dd > 21) {
        out.push({
          key: "ga-" + g.name,
          type: "group_attendance",
          level: "attention",
          groupName: g.name,
          title: groupLabel(g.name) + " sem registro de presença",
          why: ["Última presença há " + dd + " dias"],
          date: nowIso,
          category: "Groups",
        });
      }
    }
  }
  return out;
}

// --- Signals de tarefas designadas (Teams) ---
// Legado usava esc() no título; aqui o texto é dado puro e o React escapa na
// renderização — saída exibida equivalente, sem HTML no domínio.
export function taskSignals(tasks: Task[], now: Date): Signal[] {
  const nowIso = isoDate(now);
  return tasks
    .filter((t) => !t.done && t.who)
    .map((t) => ({
      key: "task-" + t.id,
      type: "team",
      level: "notice" as const,
      title: t.who + " foi designado: " + t.text,
      why: [],
      date: nowIso,
      category: "Teams" as const,
      stickName: t.who,
    }));
}

// --- Signals de Cultos & Eventos (Step 6 · Fase 6) — só dado real ---
// (O legado computava um `teamNames` a partir de state.teams que nunca era
// usado — código morto omitido aqui.)
export function serviceEventSignals(
  services: Service[],
  sessions: Session[],
  schedule: ScheduleAssignment[],
  events: ChurchEvent[],
  eventRegs: EventRegistration[],
  people: SignalPerson[],
  activeCampus: string,
  now: Date,
): Signal[] {
  const out: Signal[] = [];
  const nowIso = isoDate(now);
  const peopleIndex = new Map(people.map((p) => [p.id, p]));
  const svcs = services.filter((s) => s.active !== false && (!s.campus || s.campus === activeCampus));
  for (const s of svcs) {
    const sess = sessions
      .filter((x) => x.service === s.id)
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (sess.length >= 3) {
      const counts = sess.map((x) => (x.attendees || []).length);
      const latest = counts[counts.length - 1]!;
      const prev = counts.slice(Math.max(0, counts.length - 4), counts.length - 1);
      const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
      if (avg > 0 && latest < avg * 0.8) {
        const pct = Math.round((1 - latest / avg) * 100);
        out.push({
          key: "svc-drop-" + s.id,
          type: "service_attendance",
          level: "attention",
          title: "Presença caiu em " + s.name,
          why: ["Última: " + latest + " · média recente: " + Math.round(avg) + " (−" + pct + "%)"],
          date: nowIso,
          category: "Services",
        });
      }
      if (latest > 0 && latest === Math.max(...counts)) {
        out.push({
          key: "svc-record-" + s.id + "-" + latest,
          type: "service_attendance",
          level: "celebration",
          title: s.name + " teve a maior presença registrada",
          why: [latest + " presentes"],
          date: sess[sess.length - 1]!.date || nowIso,
          category: "Celebration",
        });
      }
    }
    // Visitantes no último culto → oportunidade de follow-up (Journey).
    if (sess.length) {
      const last = sess[sess.length - 1]!;
      const vis = (last.attendees || []).filter((aid) => {
        const p = peopleIndex.get(aid);
        return p ? isVisitor(p.relationship) : false;
      }).length;
      if (vis > 0) {
        out.push({
          key: "svc-vis-" + s.id + "-" + (last.date || ""),
          type: "service_visitor",
          level: "notice",
          title: vis + " visitante" + (vis > 1 ? "s" : "") + " no último " + s.name,
          why: ["Acompanhe o follow-up e a Journey"],
          date: last.date || nowIso,
          category: "Services",
        });
      }
    }
  }

  // Escala sem cobertura (substituto pendente / recusada) numa data futura.
  const need = schedule.filter(
    (a) => a.assignment_date && a.assignment_date >= nowIso && (a.status === "replacement_needed" || a.status === "declined"),
  );
  if (need.length) {
    out.push({
      key: "svc-cover",
      type: "service_coverage",
      level: "attention",
      title: need.length + " escalação" + (need.length > 1 ? "ões" : "") + " sem cobertura",
      why: ["Alguém recusou ou pediu substituto"],
      date: nowIso,
      category: "Services",
    });
  }

  // Evento próximo (até 14 dias) — lembrete operacional.
  for (const e of events) {
    if (e.status !== "active" || !e.event_date || (e.campus && e.campus !== activeCampus)) continue;
    const dd = Math.round((new Date(e.event_date + "T00:00:00").getTime() - now.getTime()) / DAY);
    if (dd >= 0 && dd <= 14) {
      const regs = eventRegs.filter((r) => r.event_id === e.id).length;
      out.push({
        key: "evt-soon-" + e.id,
        type: "event_upcoming",
        level: "notice",
        title: e.name + (dd === 0 ? " é hoje" : dd === 1 ? " é amanhã" : " em " + dd + " dias"),
        why: [regs + " inscrito" + (regs !== 1 ? "s" : "") + (e.capacity ? " de " + e.capacity : "")],
        date: nowIso,
        category: "Services",
      });
    }
  }
  return out;
}

// --- Signals de serviço (Step 7 · Fase 5) — times/escala. Só dado real ---
function weekNum(dateIso: string): number {
  return Math.floor(new Date(dateIso + "T00:00:00").getTime() / WEEK);
}
function consecutiveWeekStreak(dates: string[], now: Date): number {
  const weeks: Record<number, 1> = {};
  for (const d of dates) weeks[weekNum(d)] = 1;
  const curW = Math.floor(now.getTime() / WEEK);
  const served = Object.keys(weeks)
    .map(Number)
    .filter((w) => w <= curW)
    .sort((a, b) => b - a);
  if (!served.length) return 0;
  let streak = 0;
  let w = served[0]!;
  while (weeks[w]) {
    streak++;
    w--;
  }
  return streak;
}

export function serviceSignals(
  people: SignalPerson[],
  teams: Team[],
  teamMembers: TeamMember[],
  schedule: ScheduleAssignment[],
  activeCampus: string,
  now: Date,
): Signal[] {
  const out: Signal[] = [];
  const nowIso = isoDate(now);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const activeTeams = teams.filter((t) => t.status === "active" && (t.campus === activeCampus || !t.campus));
  const actByTeam = new Map<string, TeamMember[]>();
  const servingIds = new Set<string>();
  for (const m of teamMembers) {
    if (m.status !== "active") continue;
    (actByTeam.get(m.team_id) ?? actByTeam.set(m.team_id, []).get(m.team_id)!).push(m);
    servingIds.add(m.stick_id);
  }

  for (const t of activeTeams) {
    const act = actByTeam.get(t.id) ?? [];
    if (act.length === 0) {
      out.push({
        key: "tm-empty-" + t.id,
        type: "team_health",
        level: "attention",
        title: "Time " + t.name + " está sem ninguém servindo",
        why: ["Nenhuma pessoa ativa no time"],
        date: nowIso,
        category: "Teams",
      });
    } else if (act.length <= 3) {
      out.push({
        key: "tm-few-" + t.id,
        type: "team_health",
        level: "attention",
        title: "Time " + t.name + " depende de poucas pessoas",
        why: [act.length + " pessoa" + (act.length > 1 ? "s" : "") + " servindo"],
        date: nowIso,
        category: "Teams",
      });
    }
    if (!t.leader_id) {
      out.push({
        key: "tm-noleader-" + t.id,
        type: "team_health",
        level: "notice",
        title: "Time " + t.name + " sem líder",
        why: ["Nenhum líder definido"],
        date: nowIso,
        category: "Teams",
      });
    }
  }

  // Oportunidade: conectados (em grupo) que ainda não servem. O legado filtra
  // !p.archived; aqui a query exclui arquivados a montante (Person sem archived).
  const cns = people.filter((p) => inCampus(p.campus, activeCampus) && p.group && !servingIds.has(p.id));
  if (cns.length) {
    out.push({
      key: "tm-connns",
      type: "serving_opportunity",
      level: "notice",
      title:
        cns.length +
        " pessoa" +
        (cns.length > 1 ? "s" : "") +
        " conectada" +
        (cns.length > 1 ? "s" : "") +
        " ainda não serve" +
        (cns.length > 1 ? "m" : ""),
      why: ["Estão em grupo, mas não em nenhum time"],
      date: nowIso,
      category: "Teams",
    });
  }

  // Começou a servir (joined_at recente) → sugere marcar Journey 'Servindo'.
  for (const m of teamMembers) {
    if (m.status !== "active" || !m.joined_at) continue;
    const dd = daysBetween(now, m.joined_at);
    if (dd < 0 || dd > 21) continue;
    const p = peopleById.get(m.stick_id);
    if (!p || !inCampus(p.campus, activeCampus)) continue;
    const t = teams.find((x) => x.id === m.team_id);
    out.push({
      key: "tm-start-" + m.id,
      type: "serving_start",
      level: "celebration",
      stickId: p.id,
      stickName: p.name,
      title: p.name + " começou a servir" + (t ? " em " + t.name : ""),
      why: ["Considere marcar como Servindo na Journey"],
      date: m.joined_at,
      category: "Teams",
    });
  }

  // Cuidado: quem serve há muitas semanas seguidas — atenção ao cansaço.
  const byStick = new Map<string, string[]>();
  for (const a of schedule) {
    if (a.stick_id && a.assignment_date) {
      (byStick.get(a.stick_id) ?? byStick.set(a.stick_id, []).get(a.stick_id)!).push(a.assignment_date);
    }
  }
  for (const [sid, dates] of byStick) {
    const streak = consecutiveWeekStreak(dates, now);
    if (streak < 10) continue;
    const p = peopleById.get(sid);
    if (!p || !inCampus(p.campus, activeCampus)) continue;
    out.push({
      key: "tm-streak-" + sid,
      type: "serving_care",
      level: "notice",
      stickId: p.id,
      stickName: p.name,
      title: p.name + " serve há " + streak + " semanas seguidas",
      why: ["Atenção ao descanso — evite o cansaço"],
      date: nowIso,
      category: "Care",
    });
  }
  return out;
}

// --- Composição: todos os Signals (ordem preservada de derived.js) ---
export interface SignalsInput {
  people: SignalPerson[];
  milestonesByStick: Map<string, Milestone[]>;
  groupsHealth: GroupHealth[];
  sessions: Session[];
  tasks: Task[];
  teams: Team[];
  teamMembers: TeamMember[];
  schedule: ScheduleAssignment[];
  services: Service[];
  events: ChurchEvent[];
  eventRegs: EventRegistration[];
  activeCampus: string;
}

export function signals(input: SignalsInput, now: Date): Signal[] {
  return [
    ...peopleSignals(input.people, input.milestonesByStick, input.activeCampus, now),
    ...groupHealthSignals(input.groupsHealth, input.sessions, now),
    ...taskSignals(input.tasks, now),
    ...serviceSignals(input.people, input.teams, input.teamMembers, input.schedule, input.activeCampus, now),
    ...serviceEventSignals(
      input.services,
      input.sessions,
      input.schedule,
      input.events,
      input.eventRegs,
      input.people,
      input.activeCampus,
      now,
    ),
  ];
}

// --- Overrides (status por Signal): new | seen | dismissed ---
export type SignalStatus = "new" | "seen" | "dismissed";
export type SignalOverrides = Record<string, { status: SignalStatus } | undefined>;

export function sigStatus(overrides: SignalOverrides, key: string): SignalStatus {
  return overrides[key]?.status ?? "new";
}
export function activeSignals(all: Signal[], overrides: SignalOverrides): Signal[] {
  return all.filter((s) => sigStatus(overrides, s.key) !== "dismissed");
}
export function signalsFor(all: Signal[], overrides: SignalOverrides, stickId: string): Signal[] {
  return activeSignals(all, overrides).filter((s) => s.stickId === stickId);
}
