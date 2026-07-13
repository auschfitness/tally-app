// Repositório de Ministérios (Step 7 · Fase 1 — Serviço). Um ministério é a área
// mais ampla que contém Times (ex.: Ministério de Louvor → Time de Banda, Mídia).
// Tabela `ministries` (org_id direto). Relacional-nativo (não vem do app_state).
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID.
// campus é NOME no app, campus_id é uuid na tabela → resolve nos dois sentidos.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

const STATUS = ["active", "inactive", "archived"];
function statusOr(v) { return STATUS.indexOf(v) >= 0 ? v : "active"; }

async function campusMaps() {
  const c = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (c.data || []).forEach(x => { byName[x.name] = x.id; byId[x.id] = x.name; });
  return { byName, byId };
}

function rowToMinistry(row, maps) {
  return {
    id: row.id,
    name: row.name || "", description: row.description || "",
    campus: (maps && maps.byId[row.campus_id]) || "",
    leader_id: row.leader_id || null, color: row.color || "",
    status: row.status || "active",
  };
}

function ministryToRow(m, campusId) {
  return {
    org_id: ORG_ID,
    name: m.name || "(sem nome)", description: m.description || null,
    campus_id: campusId || null,
    leader_id: isUuid(m.leader_id) ? m.leader_id : null,
    color: m.color || null, status: statusOr(m.status),
  };
}

// Carrega os ministérios da org. Nunca rejeita.
export async function hydrateMinistries(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const res = await SB.from("ministries").select("*").order("created_at", { ascending: true });
    if (res.error) { console.warn("hydrateMinistries:", res.error.message); return; }
    st.ministries = (res.data || []).map(r => rowToMinistry(r, maps));
  } catch (e) {
    console.warn("hydrateMinistries(exceção):", e && e.message);
  }
}

export async function createMinistry(m) {
  if (!SB || !ORG_ID) return null;
  const maps = await campusMaps();
  const { data, error } = await SB.from("ministries").insert(ministryToRow(m, m.campus ? maps.byName[m.campus] : null)).select("*").single();
  if (error || !data) { console.warn("createMinistry:", error && error.message); return null; }
  if (!state.ministries) state.ministries = [];
  state.ministries.push(rowToMinistry(data, maps));
  save();
  return data.id;
}

export async function updateMinistry(id, m) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const maps = await campusMaps();
  const { error } = await SB.from("ministries").update(ministryToRow(m, m.campus ? maps.byName[m.campus] : null)).eq("id", id);
  if (error) { console.warn("updateMinistry:", error.message); return; }
  const ex = (state.ministries || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToMinistry(Object.assign({}, ministryToRow(m, m.campus ? maps.byName[m.campus] : null), { id: id }), maps), { campus: m.campus || "" });
  save();
}

export async function deleteMinistry(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("ministries").delete().eq("id", id);
  if (error) { console.warn("deleteMinistry:", error.message); return; }
  state.ministries = (state.ministries || []).filter(x => x.id !== id);
  // times órfãos: solta o vínculo em memória (o banco tem FK set null se configurado)
  (state.teams || []).forEach(t => { if (t.ministry_id === id) t.ministry_id = null; });
  save();
}
