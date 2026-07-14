// Repositório de Serviços/Cultos (Step 6 · Fase 1). Um Service é um culto recorrente
// (Domingo 9h, Quarta de oração, Culto de jovens) — pertence a campus/local/horário.
// Cada OCORRÊNCIA vira uma `attendance_sessions` (context_type='service', context_id=service).
// Tabela `services` (org_id direto). Relacional-nativo. RLS is_org_member.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID.
// campus é NOME no app, campus_id é uuid na tabela → resolve nos dois sentidos.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

const PATTERN = ["weekly", "monthly", "custom"];
function patternOr(v) { return PATTERN.indexOf(v) >= 0 ? v : "weekly"; }
function weekdayOr(v) { var n = parseInt(v, 10); return (n >= 0 && n <= 6) ? n : null; }

async function campusMaps() {
  const c = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (c.data || []).forEach(x => { byName[x.name] = x.id; byId[x.id] = x.name; });
  return { byName, byId };
}

function rowToService(row, maps) {
  return {
    id: row.id,
    name: row.name || "", type: row.type || "",
    campus: (maps && maps.byId[row.campus_id]) || "",
    weekday: (row.weekday === null || row.weekday === undefined) ? null : row.weekday,
    start_time: row.start_time || "", end_time: row.end_time || "",
    location: row.location || "", recurring_pattern: row.recurring_pattern || "weekly",
    description: row.description || "", active: row.active !== false,
  };
}

function serviceToRow(s, campusId) {
  return {
    org_id: ORG_ID,
    name: s.name || "(sem nome)", type: s.type || null,
    campus_id: campusId || null,
    weekday: weekdayOr(s.weekday),
    start_time: s.start_time || null, end_time: s.end_time || null,
    location: s.location || null, recurring_pattern: patternOr(s.recurring_pattern),
    description: s.description || null, active: s.active !== false,
  };
}

// Carrega os serviços da org. Nunca rejeita.
export async function hydrateServices(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const res = await SB.from("services").select("*").order("weekday", { ascending: true, nullsFirst: false }).order("start_time", { ascending: true });
    if (res.error) { console.warn("hydrateServices:", res.error.message); return; }
    st.services = (res.data || []).map(r => rowToService(r, maps));
  } catch (e) {
    console.warn("hydrateServices(exceção):", e && e.message);
  }
}

export async function createService(s) {
  if (!SB || !ORG_ID) return null;
  const maps = await campusMaps();
  const { data, error } = await SB.from("services").insert(serviceToRow(s, s.campus ? maps.byName[s.campus] : null)).select("*").single();
  if (error || !data) { console.warn("createService:", error && error.message); return null; }
  if (!state.services) state.services = [];
  state.services.push(rowToService(data, maps));
  save();
  return data.id;
}

export async function updateService(id, s) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const maps = await campusMaps();
  const { error } = await SB.from("services").update(serviceToRow(s, s.campus ? maps.byName[s.campus] : null)).eq("id", id);
  if (error) { console.warn("updateService:", error.message); return; }
  const ex = (state.services || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToService(Object.assign({}, serviceToRow(s, s.campus ? maps.byName[s.campus] : null), { id: id }), maps), { campus: s.campus || "" });
  save();
}

export async function deleteService(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("services").delete().eq("id", id);
  if (error) { console.warn("deleteService:", error.message); return; }
  state.services = (state.services || []).filter(x => x.id !== id);
  save();
}
