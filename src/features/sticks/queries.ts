// Consultas de Sticks (centralizadas por feature; sem blocos de query soltos na
// UI). Só os campos necessários, tipadas, tratando ausência. RLS filtra por org;
// o filtro explícito por org_id é defesa em profundidade, não substitui o RLS.
import type { DB } from "@/lib/auth/session";
import type { Person } from "./types";
import { journeyCodeForPosition, type Relationship, RELATIONSHIPS } from "./domain";

function asRelationship(v: string): Relationship {
  return (RELATIONSHIPS as string[]).includes(v) ? (v as Relationship) : "member";
}

// Todas as Sticks ativas de uma org, já com campus, estágio de jornada e grupo
// (de group_members) resolvidos. Ordenadas por nome.
export async function listSticks(supabase: DB, orgId: string): Promise<Person[]> {
  const [sticksRes, stagesRes, campusRes, membersRes, groupsRes] = await Promise.all([
    supabase
      .from("sticks")
      .select(
        "id, full_name, relationship_status, is_leader, primary_campus_id, last_seen_at, followup_open, first_visit_date, source, birth_date, journey_stage_id",
      )
      .eq("org_id", orgId)
      .eq("archived", false)
      .order("full_name"),
    supabase.from("journey_stages").select("id, position"),
    supabase.from("campuses").select("id, name").eq("org_id", orgId),
    supabase.from("group_members").select("stick_id, group_id, status").eq("status", "active"),
    supabase.from("groups").select("id, name").eq("org_id", orgId),
  ]);

  if (sticksRes.error) throw new Error(sticksRes.error.message);

  const positionById = new Map<string, number>();
  for (const s of stagesRes.data ?? []) positionById.set(s.id, s.position);

  const campusById = new Map<string, string>();
  for (const c of campusRes.data ?? []) campusById.set(c.id, c.name);

  const groupNameById = new Map<string, string>();
  for (const g of groupsRes.data ?? []) groupNameById.set(g.id, g.name);

  const groupByStick = new Map<string, string>();
  for (const m of membersRes.data ?? []) {
    if (!groupByStick.has(m.stick_id)) {
      groupByStick.set(m.stick_id, groupNameById.get(m.group_id) ?? "");
    }
  }

  return (sticksRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name,
    relationship: asRelationship(row.relationship_status),
    isLeader: row.is_leader,
    campus: (row.primary_campus_id && campusById.get(row.primary_campus_id)) || "",
    lastSeen: row.last_seen_at,
    followup: row.followup_open,
    firstVisit: row.first_visit_date,
    source: row.source,
    birthDate: row.birth_date,
    journeyStage: journeyCodeForPosition(row.journey_stage_id ? positionById.get(row.journey_stage_id) : null),
    group: groupByStick.get(row.id) ?? "",
  }));
}

// Nomes de grupos da org (para o select do formulário de pessoa).
export async function listGroupNames(supabase: DB, orgId: string): Promise<string[]> {
  const { data, error } = await supabase.from("groups").select("name").eq("org_id", orgId).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => g.name);
}
