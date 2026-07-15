// Consultas de Eventos. Só os campos necessários, tipadas, tratando ausência. RLS
// filtra por org; `.eq("org_id")` é defesa em profundidade. `campus_id`→NOME.
// `start_time`/`end_time` (HH:MM) extraídos de `starts_at`/`end_time` timestamptz.
// Ver docs/handoffs/events-supabase.md.
import type { DB } from "@/lib/auth/session";
import { timeOf } from "./domain";
import type { EventItem, EventRegistration, EventStatus } from "./types";

const STATUS = new Set<EventStatus>(["draft", "active", "completed", "cancelled"]);
function statusOr(v: string | null): EventStatus {
  return v && STATUS.has(v as EventStatus) ? (v as EventStatus) : "active";
}

async function campusNameById(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const res = await supabase.from("campuses").select("id, name").eq("org_id", orgId);
  const map = new Map<string, string>();
  for (const c of res.data ?? []) map.set(c.id, c.name);
  return map;
}

export async function listEvents(supabase: DB, orgId: string): Promise<EventItem[]> {
  const [res, campusMap] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, name, type, description, campus_id, event_date, starts_at, end_time, location, capacity, registration_required, payment_required, check_in_enabled, status, cover_image",
      )
      .eq("org_id", orgId)
      .order("event_date", { ascending: false, nullsFirst: false }),
    campusNameById(supabase, orgId),
  ]);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? "",
    type: r.type ?? "",
    description: r.description ?? "",
    campus: (r.campus_id && campusMap.get(r.campus_id)) || "",
    event_date: r.event_date ?? "",
    start_time: timeOf(r.starts_at),
    end_time: timeOf(r.end_time),
    location: r.location ?? "",
    capacity: r.capacity ?? null,
    registration_required: !!r.registration_required,
    payment_required: !!r.payment_required,
    check_in_enabled: !!r.check_in_enabled,
    status: statusOr(r.status),
    cover_image: r.cover_image ?? "",
  }));
}

// Nº de inscritos por evento — para o rótulo de vagas do card.
export async function eventRegCounts(supabase: DB, orgId: string): Promise<Map<string, number>> {
  const res = await supabase.from("event_registrations").select("event_id").eq("org_id", orgId);
  const map = new Map<string, number>();
  for (const r of res.data ?? []) map.set(r.event_id, (map.get(r.event_id) ?? 0) + 1);
  return map;
}

function rowToReg(r: {
  id: string;
  event_id: string;
  stick_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  household: string | null;
  payment_status: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}): EventRegistration {
  return {
    id: r.id,
    event_id: r.event_id,
    stick_id: r.stick_id ?? null,
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    household: r.household ?? "",
    payment_status: r.payment_status ?? "",
    checked_in: !!r.checked_in,
    checked_in_at: r.checked_in_at ?? null,
  };
}

// Inscrições de um evento, em ordem de criação (como o hydrate legado).
export async function listEventRegistrations(supabase: DB, orgId: string, eventId: string): Promise<EventRegistration[]> {
  const res = await supabase
    .from("event_registrations")
    .select("id, event_id, stick_id, name, email, phone, household, payment_status, checked_in, checked_in_at")
    .eq("org_id", orgId)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map(rowToReg);
}
