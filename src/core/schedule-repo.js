// Repositório da Escala de serviço (Step 7 · Fase 3). Tabela `schedule_assignments`
// (org_id direto): conecta Serviço/Evento → Time → Papel → Stick numa data, com status.
// Serviços/eventos são Step 6 (tabelas ainda vazias) → por ora a escala é por DATA
// (assignment_date); service_id/event_id ficam nulos como gancho para o Step 6.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

const STATUS = ["assigned", "confirmed", "declined", "replacement_needed", "completed"];
function statusOr(v) { return STATUS.indexOf(v) >= 0 ? v : "assigned"; }

function rowToAssignment(row) {
  return {
    id: row.id, service_id: row.service_id || null, event_id: row.event_id || null,
    team_id: row.team_id || null, role: row.role || "", stick_id: row.stick_id || null,
    assignment_date: row.assignment_date || "", status: row.status || "assigned",
    confirmed_at: row.confirmed_at || null,
  };
}

// Carrega a escala da org. Nunca rejeita.
export async function hydrateSchedule(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("schedule_assignments").select("*").order("assignment_date", { ascending: true });
    if (res.error) { console.warn("hydrateSchedule:", res.error.message); return; }
    st.schedule = (res.data || []).map(rowToAssignment);
  } catch (e) {
    console.warn("hydrateSchedule(exceção):", e && e.message);
  }
}

// Cria uma escalação (Time → Papel → Stick numa data).
export async function createAssignment(a) {
  if (!SB || !ORG_ID || !isUuid(a.team_id) || !isUuid(a.stick_id) || !a.assignment_date) return null;
  const row = {
    org_id: ORG_ID, service_id: isUuid(a.service_id) ? a.service_id : null,
    event_id: isUuid(a.event_id) ? a.event_id : null,
    team_id: a.team_id, role: a.role || null, stick_id: a.stick_id,
    assignment_date: a.assignment_date, status: statusOr(a.status),
  };
  const { data, error } = await SB.from("schedule_assignments").insert(row).select("*").single();
  if (error || !data) { console.warn("createAssignment:", error && error.message); return null; }
  if (!state.schedule) state.schedule = [];
  state.schedule.push(rowToAssignment(data));
  save();
  return data.id;
}

// Muda o status de uma escalação. Confirmar carimba confirmed_at.
export async function setAssignmentStatus(id, status) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const st = statusOr(status);
  const patch = { status: st, confirmed_at: st === "confirmed" ? nowIso() : null };
  const { error } = await SB.from("schedule_assignments").update(patch).eq("id", id);
  if (error) { console.warn("setAssignmentStatus:", error.message); return; }
  const ex = (state.schedule || []).find(x => x.id === id);
  if (ex) { ex.status = st; ex.confirmed_at = patch.confirmed_at; }
  save();
}

export async function deleteAssignment(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("schedule_assignments").delete().eq("id", id);
  if (error) { console.warn("deleteAssignment:", error.message); return; }
  state.schedule = (state.schedule || []).filter(x => x.id !== id);
  save();
}
