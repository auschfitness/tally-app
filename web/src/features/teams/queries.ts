// Consultas de Times/Ministérios/Escala. Centralizadas por feature; só os campos
// necessários, tipadas, tratando ausência. RLS filtra por org; o `.eq("org_id")` é
// defesa em profundidade. `campus_id` (uuid) resolve para NOME. Sticks arquivadas
// são excluídas a montante (o tipo migrado não carrega `archived`). Ver
// docs/handoffs/teams-supabase.md.
import type { DB } from "@/lib/auth/session";
import type { LeadershipDev, Ministry, ScheduleAssignment, Team, TeamMember } from "./types";
import type { MemberStatus, MinistryStatus, TeamStatus, AssignmentStatus } from "./types";

const TEAM_STATUS = new Set<TeamStatus>(["active", "inactive", "archived"]);
const MIN_STATUS = new Set<MinistryStatus>(["active", "inactive", "archived"]);
const MEMBER_STATUS = new Set<MemberStatus>(["active", "paused", "inactive"]);
const ASG_STATUS = new Set<AssignmentStatus>(["assigned", "confirmed", "declined", "replacement_needed", "completed"]);

function teamStatusOr(v: string): TeamStatus {
  return TEAM_STATUS.has(v as TeamStatus) ? (v as TeamStatus) : "active";
}
function minStatusOr(v: string): MinistryStatus {
  return MIN_STATUS.has(v as MinistryStatus) ? (v as MinistryStatus) : "active";
}
function memberStatusOr(v: string): MemberStatus {
  return MEMBER_STATUS.has(v as MemberStatus) ? (v as MemberStatus) : "active";
}
function asgStatusOr(v: string): AssignmentStatus {
  return ASG_STATUS.has(v as AssignmentStatus) ? (v as AssignmentStatus) : "assigned";
}

async function campusNameById(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const res = await supabase.from("campuses").select("id, name").eq("org_id", orgId);
  const map = new Map<string, string>();
  for (const c of res.data ?? []) map.set(c.id, c.name);
  return map;
}

// Dados agregados que quase toda tela de Times usa. Uma passada, sem N+1.
export interface TeamsData {
  ministries: Ministry[];
  teams: Team[];
  members: TeamMember[];
  schedule: ScheduleAssignment[];
  leadershipDev: LeadershipDev;
  /** nome por stickId — só de sticks NÃO arquivadas da org. */
  nameByStick: Map<string, string>;
}

export async function loadTeamsData(supabase: DB, orgId: string): Promise<TeamsData> {
  const [minRes, teamRes, memRes, schedRes, sticksRes, stateRes, campusMap] = await Promise.all([
    supabase.from("ministries").select("*").eq("org_id", orgId).order("created_at", { ascending: true }),
    supabase.from("teams").select("*").eq("org_id", orgId).order("created_at", { ascending: true }),
    supabase.from("team_members").select("*").eq("org_id", orgId),
    supabase.from("schedule_assignments").select("*").eq("org_id", orgId).order("assignment_date", { ascending: true }),
    supabase.from("sticks").select("id, full_name").eq("org_id", orgId).eq("archived", false),
    supabase.from("app_state").select("data").eq("org_id", orgId).maybeSingle(),
    campusNameById(supabase, orgId),
  ]);

  if (teamRes.error) throw new Error(teamRes.error.message);
  if (minRes.error) throw new Error(minRes.error.message);

  const nameByStick = new Map<string, string>();
  for (const s of sticksRes.data ?? []) nameByStick.set(s.id, s.full_name);

  const ministries: Ministry[] = (minRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? "",
    description: r.description ?? "",
    campus: (r.campus_id && campusMap.get(r.campus_id)) || "",
    leader_id: r.leader_id ?? null,
    color: r.color ?? "",
    status: minStatusOr(r.status ?? "active"),
  }));

  const teams: Team[] = (teamRes.data ?? []).map((r) => ({
    id: r.id,
    ministry_id: r.ministry_id ?? null,
    name: r.name ?? "",
    description: r.description ?? "",
    campus: (r.campus_id && campusMap.get(r.campus_id)) || "",
    leader_id: r.leader_id ?? null,
    serving_roles: Array.isArray(r.serving_roles) ? (r.serving_roles as string[]) : [],
    status: teamStatusOr(r.status ?? "active"),
  }));

  const members: TeamMember[] = (memRes.data ?? []).map((r) => ({
    id: r.id,
    team_id: r.team_id,
    stick_id: r.stick_id,
    role: r.role ?? "",
    status: memberStatusOr(r.status ?? "active"),
    availability: r.availability ?? "",
    joined_at: r.joined_at ?? "",
    notes: r.notes ?? "",
  }));

  const schedule: ScheduleAssignment[] = (schedRes.data ?? []).map((r) => ({
    id: r.id,
    service_id: r.service_id ?? null,
    event_id: r.event_id ?? null,
    team_id: r.team_id ?? null,
    role: r.role ?? "",
    stick_id: r.stick_id ?? null,
    assignment_date: r.assignment_date ?? "",
    status: asgStatusOr(r.status ?? "assigned"),
    confirmed_at: r.confirmed_at ?? null,
  }));

  return { ministries, teams, members, schedule, leadershipDev: readLeadershipDev(stateRes.data?.data), nameByStick };
}

// Lê o sub-campo leadershipDev do blob app_state, com validação defensiva (o blob
// é um Json livre). Chaves inválidas viram objeto vazio.
export function readLeadershipDev(data: unknown): LeadershipDev {
  const out: LeadershipDev = {};
  if (!data || typeof data !== "object") return out;
  const ld = (data as Record<string, unknown>).leadershipDev;
  if (!ld || typeof ld !== "object") return out;
  for (const [k, v] of Object.entries(ld as Record<string, unknown>)) {
    if (v === "apprentice" || v === "co_leader" || v === "leader" || v === "serving") out[k] = v;
  }
  return out;
}
