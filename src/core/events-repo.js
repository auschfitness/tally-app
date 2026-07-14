// Repositório de Eventos (Step 6 · Fase 4). Evento especial (conferência, retiro,
// curso) — NÃO é um culto recorrente. Tabelas `events` (org_id direto) e
// `event_registrations` (inscrição/check-in INTERNOS — staff logado, sem página anon).
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID.
// campus é NOME no app, campus_id é uuid → resolve nos dois sentidos.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

const STATUS = ["draft", "active", "completed", "cancelled"];
function statusOr(v) { return STATUS.indexOf(v) >= 0 ? v : "active"; }
// Monta um timestamp ISO de uma data (YYYY-MM-DD) + hora (HH:MM). Sem hora → null.
function tsFrom(date, time) { if (!date || !time) return null; return date + "T" + time + ":00"; }
function timeOf(ts) { if (!ts) return ""; var m = /T(\d{2}:\d{2})/.exec(ts); return m ? m[1] : ""; }

async function campusMaps() {
  const c = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (c.data || []).forEach(x => { byName[x.name] = x.id; byId[x.id] = x.name; });
  return { byName, byId };
}

function rowToEvent(row, maps) {
  return {
    id: row.id,
    name: row.name || "", type: row.type || "", description: row.description || "",
    campus: (maps && maps.byId[row.campus_id]) || "",
    event_date: row.event_date || "",
    start_time: timeOf(row.starts_at), end_time: timeOf(row.end_time),
    location: row.location || "", capacity: (row.capacity == null ? null : row.capacity),
    registration_required: !!row.registration_required, payment_required: !!row.payment_required,
    check_in_enabled: !!row.check_in_enabled, status: row.status || "active",
    cover_image: row.cover_image || "",
  };
}

function eventToRow(e, campusId) {
  return {
    org_id: ORG_ID,
    name: e.name || "(sem nome)", type: e.type || null, description: e.description || null,
    campus_id: campusId || null,
    event_date: e.event_date || null,
    starts_at: tsFrom(e.event_date, e.start_time),
    end_time: tsFrom(e.event_date, e.end_time),
    location: e.location || null,
    capacity: (e.capacity === "" || e.capacity == null) ? null : parseInt(e.capacity, 10),
    registration_required: !!e.registration_required, payment_required: !!e.payment_required,
    check_in_enabled: !!e.check_in_enabled, status: statusOr(e.status),
    cover_image: e.cover_image || null,
  };
}

function rowToReg(row) {
  return {
    id: row.id, event_id: row.event_id, stick_id: row.stick_id || null,
    name: row.name || "", email: row.email || "", phone: row.phone || "",
    household: row.household || "", answers: row.answers || {},
    payment_status: row.payment_status || "", checked_in: !!row.checked_in,
    checked_in_at: row.checked_in_at || null,
  };
}

// Carrega eventos da org. Nunca rejeita.
export async function hydrateEvents(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const res = await SB.from("events").select("*").order("event_date", { ascending: false, nullsFirst: false });
    if (res.error) { console.warn("hydrateEvents:", res.error.message); return; }
    st.events = (res.data || []).map(r => rowToEvent(r, maps));
  } catch (e) {
    console.warn("hydrateEvents(exceção):", e && e.message);
  }
}

// Carrega inscrições da org. Nunca rejeita.
export async function hydrateEventRegs(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("event_registrations").select("*").order("created_at", { ascending: true });
    if (res.error) { console.warn("hydrateEventRegs:", res.error.message); return; }
    st.eventRegs = (res.data || []).map(rowToReg);
  } catch (e) {
    console.warn("hydrateEventRegs(exceção):", e && e.message);
  }
}

export async function createEvent(e) {
  if (!SB || !ORG_ID) return null;
  const maps = await campusMaps();
  const { data, error } = await SB.from("events").insert(eventToRow(e, e.campus ? maps.byName[e.campus] : null)).select("*").single();
  if (error || !data) { console.warn("createEvent:", error && error.message); return null; }
  if (!state.events) state.events = [];
  state.events.unshift(rowToEvent(data, maps));
  save();
  return data.id;
}

export async function updateEvent(id, e) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const maps = await campusMaps();
  const { error } = await SB.from("events").update(eventToRow(e, e.campus ? maps.byName[e.campus] : null)).eq("id", id);
  if (error) { console.warn("updateEvent:", error.message); return; }
  const ex = (state.events || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToEvent(Object.assign({}, eventToRow(e, e.campus ? maps.byName[e.campus] : null), { id: id }), maps), { campus: e.campus || "" });
  save();
}

export async function deleteEvent(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  await SB.from("event_registrations").delete().eq("event_id", id);
  const { error } = await SB.from("events").delete().eq("id", id);
  if (error) { console.warn("deleteEvent:", error.message); return; }
  state.events = (state.events || []).filter(x => x.id !== id);
  state.eventRegs = (state.eventRegs || []).filter(x => x.event_id !== id);
  save();
}

// Inscreve alguém no evento. Vincula a Stick existente (stick_id) OU registra visitante
// novo (name/email/phone, stick_id null) — NÃO cria Stick (evita duplicar pessoas).
export async function addRegistration(eventId, reg) {
  if (!SB || !ORG_ID || !isUuid(eventId)) return null;
  const row = {
    org_id: ORG_ID, event_id: eventId,
    stick_id: isUuid(reg.stick_id) ? reg.stick_id : null,
    name: reg.name || null, email: reg.email || null, phone: reg.phone || null,
    household: reg.household || null, answers: reg.answers || {},
    payment_status: reg.payment_status || null, checked_in: !!reg.checked_in,
    checked_in_at: reg.checked_in ? nowIso() : null,
  };
  const { data, error } = await SB.from("event_registrations").insert(row).select("*").single();
  if (error || !data) { console.warn("addRegistration:", error && error.message); return null; }
  if (!state.eventRegs) state.eventRegs = [];
  state.eventRegs.push(rowToReg(data));
  save();
  return data.id;
}

export async function toggleCheckIn(regId, checked) {
  if (!SB || !ORG_ID || !isUuid(regId)) return;
  const patch = { checked_in: !!checked, checked_in_at: checked ? nowIso() : null };
  const { error } = await SB.from("event_registrations").update(patch).eq("id", regId);
  if (error) { console.warn("toggleCheckIn:", error.message); return; }
  const ex = (state.eventRegs || []).find(x => x.id === regId);
  if (ex) { ex.checked_in = !!checked; ex.checked_in_at = patch.checked_in_at; }
  save();
}

export async function removeRegistration(regId) {
  if (!SB || !ORG_ID || !isUuid(regId)) return;
  const { error } = await SB.from("event_registrations").delete().eq("id", regId);
  if (error) { console.warn("removeRegistration:", error.message); return; }
  state.eventRegs = (state.eventRegs || []).filter(x => x.id !== regId);
  save();
}
