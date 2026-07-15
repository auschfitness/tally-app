// Consultas de Cultos. Só os campos necessários, tipadas, tratando ausência. RLS
// filtra por org; `.eq("org_id")` é defesa em profundidade. `campus_id`→NOME.
// Presença vem do caminho COMPARTILHADO (lib/attendance) — mesma tabela que Groups,
// separada por context_type='service'. Ver docs/handoffs/services-supabase.md.
import type { DB } from "@/lib/auth/session";
import type { PlanItem, RecurringPattern, Service, ServiceAssignment, ServiceSermon } from "./types";

const PATTERN = new Set<RecurringPattern>(["weekly", "monthly", "custom"]);
function patternOr(v: string | null): RecurringPattern {
  return v && PATTERN.has(v as RecurringPattern) ? (v as RecurringPattern) : "weekly";
}

async function campusNameById(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const res = await supabase.from("campuses").select("id, name").eq("org_id", orgId);
  const map = new Map<string, string>();
  for (const c of res.data ?? []) map.set(c.id, c.name);
  return map;
}

function rowToService(r: {
  id: string;
  name: string;
  type: string | null;
  campus_id: string | null;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  recurring_pattern: string | null;
  description: string | null;
  active: boolean;
}, campusMap: Map<string, string>): Service {
  return {
    id: r.id,
    name: r.name ?? "",
    type: r.type ?? "",
    campus: (r.campus_id && campusMap.get(r.campus_id)) || "",
    weekday: r.weekday ?? null,
    start_time: r.start_time ?? "",
    end_time: r.end_time ?? "",
    location: r.location ?? "",
    recurring_pattern: patternOr(r.recurring_pattern),
    description: r.description ?? "",
    active: r.active !== false,
  };
}

export async function listServices(supabase: DB, orgId: string): Promise<Service[]> {
  const [res, campusMap] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, type, campus_id, weekday, start_time, end_time, location, recurring_pattern, description, active")
      .eq("org_id", orgId),
    campusNameById(supabase, orgId),
  ]);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => rowToService(r, campusMap));
}

// Nº de ocorrências (attendance_sessions) por culto — para o rótulo do card.
export async function serviceOccurrenceCounts(supabase: DB, orgId: string): Promise<Map<string, number>> {
  const res = await supabase
    .from("attendance_sessions")
    .select("context_id")
    .eq("org_id", orgId)
    .eq("context_type", "service");
  const map = new Map<string, number>();
  for (const s of res.data ?? []) {
    if (s.context_id) map.set(s.context_id, (map.get(s.context_id) ?? 0) + 1);
  }
  return map;
}

// Itens da ordem do culto (template: service_id preenchido, session_id null), ordenados.
export async function listPlanItems(supabase: DB, orgId: string, serviceId: string): Promise<PlanItem[]> {
  const res = await supabase
    .from("service_plan_items")
    .select("id, service_id, session_id, position, time_label, title, duration_min, responsible, notes")
    .eq("org_id", orgId)
    .eq("service_id", serviceId)
    .is("session_id", null)
    .order("position", { ascending: true });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    id: r.id,
    service_id: r.service_id ?? null,
    session_id: r.session_id ?? null,
    position: r.position ?? 1,
    time_label: r.time_label ?? "",
    title: r.title ?? "",
    duration_min: r.duration_min ?? null,
    responsible: r.responsible ?? "",
    notes: r.notes ?? "",
  }));
}

// Sermões pregados neste culto (só leitura; navegação até o editor entra com Study).
export async function listServiceSermons(supabase: DB, orgId: string, serviceId: string): Promise<ServiceSermon[]> {
  const res = await supabase
    .from("sermons")
    .select("id, title, main_passage")
    .eq("org_id", orgId)
    .eq("service_id", serviceId);
  if (res.error) return [];
  return (res.data ?? []).map((r) => ({ id: r.id, title: r.title ?? "", mainPassage: r.main_passage ?? "" }));
}

// Times escalados para este culto (schedule_assignments.service_id). Resolve nomes.
export async function listServiceAssignments(supabase: DB, orgId: string, serviceId: string): Promise<ServiceAssignment[]> {
  const res = await supabase
    .from("schedule_assignments")
    .select("id, team_id, role, stick_id")
    .eq("org_id", orgId)
    .eq("service_id", serviceId);
  if (res.error || !res.data?.length) return [];

  const teamIds = [...new Set(res.data.map((a) => a.team_id).filter((x): x is string => !!x))];
  const stickIds = [...new Set(res.data.map((a) => a.stick_id).filter((x): x is string => !!x))];
  const [teamsRes, sticksRes] = await Promise.all([
    teamIds.length ? supabase.from("teams").select("id, name").in("id", teamIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    stickIds.length ? supabase.from("sticks").select("id, full_name").in("id", stickIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const teamName = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const personName = new Map((sticksRes.data ?? []).map((s) => [s.id, s.full_name]));

  return res.data.map((a) => ({
    id: a.id,
    team: (a.team_id && teamName.get(a.team_id)) || "Time",
    role: a.role ?? "",
    person: (a.stick_id && personName.get(a.stick_id)) || "",
  }));
}
