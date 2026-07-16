// Consultas de Journey. Junta os registros de estágio (entered_stage_at), os
// eventos de mudança de estágio (timeline_events) e os milestones de 1ª/2ª visita.
// Tudo escopo-org via RLS; só dado real.
import type { DB } from "@/lib/auth/session";

export interface JourneyData {
  enteredAtByStick: Map<string, string>;
  movementOccurredAts: string[];
  milestoneCodesByStick: Map<string, Set<string>>;
}

export async function loadJourneyData(supabase: DB, orgId: string): Promise<JourneyData> {
  const [recordsRes, eventsRes, milestonesRes, typesRes] = await Promise.all([
    supabase.from("stick_journey_records").select("stick_id, entered_stage_at").eq("org_id", orgId),
    supabase.from("timeline_events").select("occurred_at").eq("org_id", orgId).eq("event_type", "journey_stage_change"),
    supabase.from("milestones").select("stick_id, code, milestone_type_id, occurred_on").eq("org_id", orgId),
    supabase.from("milestone_types").select("id, code").eq("org_id", orgId),
  ]);

  const enteredAtByStick = new Map<string, string>();
  for (const r of recordsRes.data ?? []) {
    if (r.entered_stage_at) enteredAtByStick.set(r.stick_id, r.entered_stage_at);
  }

  const movementOccurredAts = (eventsRes.data ?? []).map((e) => e.occurred_at).filter(Boolean) as string[];

  const codeByTypeId = new Map<string, string>();
  for (const t of typesRes.data ?? []) codeByTypeId.set(t.id, t.code);

  const milestoneCodesByStick = new Map<string, Set<string>>();
  for (const m of milestonesRes.data ?? []) {
    const code = m.code ?? (m.milestone_type_id ? codeByTypeId.get(m.milestone_type_id) : null);
    if (!code) continue;
    let set = milestoneCodesByStick.get(m.stick_id);
    if (!set) {
      set = new Set<string>();
      milestoneCodesByStick.set(m.stick_id, set);
    }
    set.add(code);
  }

  return { enteredAtByStick, movementOccurredAts, milestoneCodesByStick };
}
