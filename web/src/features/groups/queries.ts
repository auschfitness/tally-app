// Consultas de Grupos. Resolve líder (group_members role='leader') e os contadores
// de novos/saídas (≤30 dias) a partir de group_members — sem depender do blob.
import type { DB } from "@/lib/auth/session";
import type { Group } from "./domain";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function listGroups(supabase: DB, orgId: string): Promise<Group[]> {
  const [groupsRes, campusRes, membersRes, sticksRes] = await Promise.all([
    supabase.from("groups").select("id, name, campus_id, meeting_day, meeting_time").eq("org_id", orgId).eq("archived", false),
    supabase.from("campuses").select("id, name").eq("org_id", orgId),
    supabase.from("group_members").select("group_id, stick_id, role, status, joined_at, left_at"),
    supabase.from("sticks").select("id, full_name").eq("org_id", orgId),
  ]);

  if (groupsRes.error) throw new Error(groupsRes.error.message);

  const campusById = new Map<string, string>();
  for (const c of campusRes.data ?? []) campusById.set(c.id, c.name);
  const nameById = new Map<string, string>();
  for (const s of sticksRes.data ?? []) nameById.set(s.id, s.full_name);

  const nowMs = Date.now();
  const members = membersRes.data ?? [];

  return (groupsRes.data ?? []).map((g): Group => {
    const gm = members.filter((m) => m.group_id === g.id);
    const leaderRow = gm.find((m) => m.role === "leader" && m.status === "active");
    const newMembers = gm.filter((m) => m.status === "active" && m.joined_at && nowMs - new Date(m.joined_at).getTime() <= THIRTY_DAYS).length;
    const leftRecently = gm.filter((m) => m.left_at && nowMs - new Date(m.left_at).getTime() <= THIRTY_DAYS).length;
    return {
      id: g.id,
      name: g.name,
      campus: (g.campus_id && campusById.get(g.campus_id)) || "",
      leader: (leaderRow && nameById.get(leaderRow.stick_id)) || "",
      day: g.meeting_day ?? "",
      time: g.meeting_time ?? "",
      newMembers,
      leftRecently,
    };
  });
}

// Sessões de presença de um grupo (context_type='group'), recentes primeiro.
export async function listGroupSessions(
  supabase: DB,
  orgId: string,
  groupId: string,
): Promise<{ date: string; count: number }[]> {
  const sessRes = await supabase
    .from("attendance_sessions")
    .select("id, session_date")
    .eq("org_id", orgId)
    .eq("context_type", "group")
    .eq("context_id", groupId)
    .order("session_date", { ascending: false });

  const sessions = sessRes.data ?? [];
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const recRes = await supabase.from("attendance_records").select("session_id").in("session_id", ids).eq("status", "present");
  const countBySession = new Map<string, number>();
  for (const r of recRes.data ?? []) countBySession.set(r.session_id, (countBySession.get(r.session_id) ?? 0) + 1);

  return sessions.map((s) => ({ date: s.session_date ?? "", count: countBySession.get(s.id) ?? 0 }));
}
