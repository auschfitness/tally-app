// Domínio de Times/Ministérios/Escala. Regras portadas 1:1 de src/views/teams.js —
// OBSERVAÇÕES operacionais, nunca score/RH/nota (DNA #3). Tudo puro e determinístico
// (recebe dados + `now`), para ser testável e reusado pela UI (RSC) e pelos Signals.
import { isoDate, today } from "@/lib/utils/date";
import type {
  AssignmentStatus,
  DevStage,
  LeadershipDev,
  MemberStatus,
  Ministry,
  ScheduleAssignment,
  Team,
  TeamMember,
  TeamStatus,
} from "./types";

// --- Rótulos e faixas (PT-BR) ---
export const TEAM_STATUS_LBL: Record<TeamStatus, string> = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };
export const TEAM_STATUS_BAND: Record<TeamStatus, string> = { active: "healthy", inactive: "attention", archived: "risk" };
export const MIN_STATUS_LBL: Record<string, string> = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };
export const MEMBER_STATUS_LBL: Record<MemberStatus, string> = { active: "Servindo", paused: "Em pausa", inactive: "Inativo" };
export const MEMBER_STATUS_BAND: Record<MemberStatus, string> = { active: "healthy", paused: "attention", inactive: "risk" };
export const DEV_LBL: Record<DevStage, string> = { serving: "Servindo", apprentice: "Aprendiz", co_leader: "Co-líder", leader: "Líder" };
// Só estes são atribuíveis na UI; "leader" vem de teams.leader_id.
export const DEV_SETTABLE: Record<string, string> = { serving: "Servindo", apprentice: "Aprendiz", co_leader: "Co-líder" };

export const ASG_STATUS_LBL: Record<AssignmentStatus, string> = {
  assigned: "Escalado",
  confirmed: "Confirmado",
  declined: "Recusou",
  replacement_needed: "Precisa cobertura",
  completed: "Concluído",
};
export const ASG_STATUS_BAND: Record<AssignmentStatus, string> = {
  assigned: "attention",
  confirmed: "healthy",
  declined: "risk",
  replacement_needed: "risk",
  completed: "healthy",
};
export const ASG_CYCLE: AssignmentStatus[] = ["assigned", "confirmed", "declined", "replacement_needed", "completed"];
export const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function nextAssignmentStatus(current: AssignmentStatus): AssignmentStatus {
  const i = ASG_CYCLE.indexOf(current);
  return ASG_CYCLE[(i + 1) % ASG_CYCLE.length]!;
}

// --- Estágio de liderança de um membro ---
// Líder = teams.leader_id; os demais vêm do blob (leadershipDev), default "serving".
export function devStage(member: TeamMember, team: Team | null, leadershipDev: LeadershipDev): DevStage {
  if (team && team.leader_id === member.stick_id) return "leader";
  return leadershipDev[member.id] ?? "serving";
}

// --- Semana / datas (para o board de escala e a janela de 8 semanas) ---
export function parseIso(s: string): Date {
  const p = (s || "").split("-");
  return new Date(+p[0]!, +p[1]! - 1, +p[2]!);
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function weekStart(anchorIso: string | null | undefined): Date {
  const d = anchorIso ? parseIso(anchorIso) : today();
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}
export function ddmm(d: Date): string {
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2);
}

// --- Saúde do time (observações operacionais, nunca nota) ---
export type HealthBand = "risk" | "attention" | "healthy" | "muted";
export interface HealthObs {
  band: HealthBand;
  text: string;
}

export function activeMembersOf(members: TeamMember[]): TeamMember[] {
  return members.filter((m) => m.status === "active");
}

// `members`/`schedule` já devem estar filtrados ao time. `now` injetado (janela de
// concentração = últimas 8 semanas / 56 dias).
export function teamHealth(team: Team, members: TeamMember[], schedule: ScheduleAssignment[], now: Date): HealthObs[] {
  const active = activeMembersOf(members);
  const obs: HealthObs[] = [];
  if (active.length === 0) obs.push({ band: "risk", text: "Ninguém serve neste time ainda." });
  else if (active.length < 3) obs.push({ band: "attention", text: "Time pequeno: " + active.length + " pessoa" + (active.length > 1 ? "s" : "") + " servindo." });
  else obs.push({ band: "healthy", text: active.length + " pessoas servindo." });

  if (!team.leader_id) obs.push({ band: "attention", text: "Sem líder definido." });

  const paused = members.filter((m) => m.status === "paused").length;
  if (paused) obs.push({ band: "attention", text: paused + " pessoa" + (paused > 1 ? "s" : "") + " em pausa." });

  const covered: Record<string, 1> = {};
  active.forEach((m) => { if (m.role) covered[m.role] = 1; });
  const uncov = (team.serving_roles || []).filter((r) => !covered[r]);
  if (uncov.length) obs.push({ band: "attention", text: "Papel sem ninguém: " + uncov.join(", ") + "." });

  const from = isoDate(addDays(now, -56)), to = isoDate(now);
  const asg = schedule.filter((a) => a.team_id === team.id && a.stick_id && a.assignment_date >= from && a.assignment_date <= to);
  if (asg.length) {
    const byStick: Record<string, number> = {};
    asg.forEach((a) => { const k = a.stick_id!; byStick[k] = (byStick[k] || 0) + 1; });
    const counts = Object.keys(byStick).map((k) => byStick[k]!).sort((a, b) => b - a);
    const total = asg.length;
    const people = counts.length;
    let acc = 0, need = 0;
    for (let i = 0; i < counts.length; i++) { acc += counts[i]!; need++; if (acc / total >= 0.7) break; }
    const pct = Math.round((acc / total) * 100);
    if (people > 1 && need <= Math.ceil(people / 2)) {
      obs.push({ band: "risk", text: need + " pessoa" + (need > 1 ? "s" : "") + " cobriram " + pct + "% das escalações das últimas 8 semanas — depende de poucos." });
    } else {
      obs.push({ band: "healthy", text: people + " pessoa" + (people > 1 ? "s" : "") + " dividiram " + total + " escalação" + (total > 1 ? "ões" : "") + " nas últimas 8 semanas." });
    }
  } else {
    obs.push({ band: "muted", text: "Ainda sem escalações recentes para avaliar distribuição." });
  }
  return obs;
}

// --- Distribuição de serviço do time (por papel e por status) ---
export interface RoleCount {
  role: string;
  count: number;
}
// Papéis dos membros ativos (na ordem em que aparecem) + papéis definidos do time
// ainda sem ninguém (count 0). Preserva a ordem do legado.
export function roleDistribution(team: Team, members: TeamMember[]): RoleCount[] {
  const active = activeMembersOf(members);
  const byRole = new Map<string, number>();
  active.forEach((m) => { const r = m.role || "Sem papel"; byRole.set(r, (byRole.get(r) ?? 0) + 1); });
  (team.serving_roles || []).forEach((r) => { if (!byRole.has(r)) byRole.set(r, 0); });
  return [...byRole].map(([role, count]) => ({ role, count }));
}

export interface StatusCounts {
  active: number;
  paused: number;
  inactive: number;
}
export function statusCounts(members: TeamMember[]): StatusCounts {
  return {
    active: members.filter((m) => m.status === "active").length,
    paused: members.filter((m) => m.status === "paused").length,
    inactive: members.filter((m) => m.status === "inactive").length,
  };
}

// --- Painel de desenvolvimento de liderança (nomes por estágio) ---
// Recebe uma função nome-por-stickId para desacoplar de como a UI resolve nomes.
export function leadershipLadder(
  members: TeamMember[],
  team: Team | null,
  leadershipDev: LeadershipDev,
  nameOf: (stickId: string) => string,
): Record<DevStage, string[]> {
  const byStage: Record<DevStage, string[]> = { serving: [], apprentice: [], co_leader: [], leader: [] };
  members.filter((m) => m.status !== "inactive").forEach((m) => {
    byStage[devStage(m, team, leadershipDev)].push(nameOf(m.stick_id) || "—");
  });
  return byStage;
}

// --- Dashboard do ministério (consciência operacional, sem score) ---
export interface MinistryTeamCount {
  team: Team;
  count: number;
}
export interface MinistryStats {
  teamCount: number;
  peopleServing: number;
  noLeader: number;
  distribution: MinistryTeamCount[];
  maxCount: number;
}
export function ministryStats(ministry: Ministry, allTeams: Team[], membersByTeam: Map<string, TeamMember[]>): MinistryStats {
  const teams = allTeams.filter((t) => t.ministry_id === ministry.id);
  const uniq = new Set<string>();
  teams.forEach((t) => activeMembersOf(membersByTeam.get(t.id) ?? []).forEach((m) => uniq.add(m.stick_id)));
  const distribution = teams.map((t) => ({ team: t, count: activeMembersOf(membersByTeam.get(t.id) ?? []).length }));
  const maxCount = distribution.reduce((a, b) => Math.max(a, b.count), 0);
  return {
    teamCount: teams.length,
    peopleServing: uniq.size,
    noLeader: teams.filter((t) => !t.leader_id).length,
    distribution,
    maxCount,
  };
}

// Barra proporcional (maior contagem = 100%). Só dado real.
export function barPct(n: number, max: number): number {
  return max ? Math.round((n / max) * 100) : 0;
}

// Parse de papéis "a, b, c" → ["a","b","c"] (sem vazios). Portado de parseRoles.
export function parseRoles(s: string): string[] {
  return (s || "").split(",").map((t) => t.trim()).filter(Boolean);
}
