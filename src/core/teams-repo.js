// Repositório de Times e da relação de serviço (Step 7 · Fase 1 — Serviço).
// Team = onde a pessoa SERVE (≠ Group, onde ela pertence). Tabelas `teams` (org_id
// direto) e `team_members` (org_id direto, UNIQUE team_id+stick_id). Relacional-nativo.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID.
// DNA: começar a servir gera timeline_events (memória da igreja). Sem score.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";
import { iso, today } from "./helpers.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

const T_STATUS = ["active", "inactive", "archived"];
const M_STATUS = ["active", "paused", "inactive"];
function teamStatusOr(v) { return T_STATUS.indexOf(v) >= 0 ? v : "active"; }
function memberStatusOr(v) { return M_STATUS.indexOf(v) >= 0 ? v : "active"; }

async function campusMaps() {
  const c = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (c.data || []).forEach(x => { byName[x.name] = x.id; byId[x.id] = x.name; });
  return { byName, byId };
}

function rowToTeam(row, maps) {
  return {
    id: row.id, ministry_id: row.ministry_id || null,
    name: row.name || "", description: row.description || "",
    campus: (maps && maps.byId[row.campus_id]) || "",
    leader_id: row.leader_id || null,
    serving_roles: Array.isArray(row.serving_roles) ? row.serving_roles : [],
    status: row.status || "active",
  };
}
function teamToRow(t, campusId) {
  return {
    org_id: ORG_ID, ministry_id: isUuid(t.ministry_id) ? t.ministry_id : null,
    name: t.name || "(sem nome)", description: t.description || null,
    campus_id: campusId || null,
    leader_id: isUuid(t.leader_id) ? t.leader_id : null,
    serving_roles: Array.isArray(t.serving_roles) ? t.serving_roles : [],
    status: teamStatusOr(t.status),
  };
}
function rowToMember(row) {
  return {
    id: row.id, team_id: row.team_id, stick_id: row.stick_id,
    role: row.role || "", status: row.status || "active",
    availability: row.availability || "", joined_at: row.joined_at || "",
    notes: row.notes || "",
  };
}

async function addTimeline(stickId, type, title, summary) {
  if (!isUuid(stickId)) return;
  const r = await SB.from("timeline_events").insert({
    org_id: ORG_ID, stick_id: stickId, event_type: type, source_module: "teams",
    title: title, summary: summary, occurred_at: nowIso(),
  });
  if (r.error) console.warn("team timeline_event:", r.error.message);
}

// Carrega times + membros de serviço. Nunca rejeita.
export async function hydrateTeams(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const tr = await SB.from("teams").select("*").order("created_at", { ascending: true });
    if (tr.error) { console.warn("hydrateTeams(teams):", tr.error.message); return; }
    st.teams = (tr.data || []).map(r => rowToTeam(r, maps));
    const mr = await SB.from("team_members").select("*");
    if (mr.error) { console.warn("hydrateTeams(members):", mr.error.message); st.teamMembers = []; return; }
    st.teamMembers = (mr.data || []).map(rowToMember);
  } catch (e) {
    console.warn("hydrateTeams(exceção):", e && e.message);
  }
}

export async function createTeam(t) {
  if (!SB || !ORG_ID) return null;
  const maps = await campusMaps();
  const { data, error } = await SB.from("teams").insert(teamToRow(t, t.campus ? maps.byName[t.campus] : null)).select("*").single();
  if (error || !data) { console.warn("createTeam:", error && error.message); return null; }
  if (!state.teams) state.teams = [];
  state.teams.push(rowToTeam(data, maps));
  save();
  return data.id;
}

export async function updateTeam(id, t) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const maps = await campusMaps();
  const { error } = await SB.from("teams").update(teamToRow(t, t.campus ? maps.byName[t.campus] : null)).eq("id", id);
  if (error) { console.warn("updateTeam:", error.message); return; }
  const ex = (state.teams || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToTeam(Object.assign({}, teamToRow(t, t.campus ? maps.byName[t.campus] : null), { id: id }), maps), { campus: t.campus || "" });
  save();
}

export async function deleteTeam(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  // remove os vínculos de serviço primeiro (team_members não tem cascade garantido)
  await SB.from("team_members").delete().eq("team_id", id);
  const { error } = await SB.from("teams").delete().eq("id", id);
  if (error) { console.warn("deleteTeam:", error.message); return; }
  state.teams = (state.teams || []).filter(x => x.id !== id);
  state.teamMembers = (state.teamMembers || []).filter(x => x.team_id !== id);
  save();
}

// Liga uma Stick a um Time (relação de serviço). Gera timeline "começou a servir".
export async function addTeamMember(teamId, stickId, opts) {
  if (!SB || !ORG_ID || !isUuid(teamId) || !isUuid(stickId)) return null;
  opts = opts || {};
  const row = {
    org_id: ORG_ID, team_id: teamId, stick_id: stickId,
    role: opts.role || null, status: memberStatusOr(opts.status),
    availability: opts.availability || null, joined_at: iso(today()),
    notes: opts.notes || null,
  };
  const { data, error } = await SB.from("team_members").upsert(row, { onConflict: "team_id,stick_id" }).select("*").single();
  if (error || !data) { console.warn("addTeamMember:", error && error.message); return null; }
  if (!state.teamMembers) state.teamMembers = [];
  const exIdx = state.teamMembers.findIndex(x => x.team_id === teamId && x.stick_id === stickId);
  if (exIdx >= 0) state.teamMembers[exIdx] = rowToMember(data); else state.teamMembers.push(rowToMember(data));
  const team = (state.teams || []).find(x => x.id === teamId);
  await addTimeline(stickId, "team_joined", "Começou a servir", team ? ("Entrou no time " + team.name) : "Entrou em um time");
  save();
  return data.id;
}

export async function updateTeamMember(id, patch) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const row = {};
  if (patch.role !== undefined) row.role = patch.role || null;
  if (patch.status !== undefined) row.status = memberStatusOr(patch.status);
  if (patch.availability !== undefined) row.availability = patch.availability || null;
  if (patch.notes !== undefined) row.notes = patch.notes || null;
  const { error } = await SB.from("team_members").update(row).eq("id", id);
  if (error) { console.warn("updateTeamMember:", error.message); return; }
  const ex = (state.teamMembers || []).find(x => x.id === id);
  if (ex) Object.assign(ex, patch);
  save();
}

export async function removeTeamMember(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("team_members").delete().eq("id", id);
  if (error) { console.warn("removeTeamMember:", error.message); return; }
  state.teamMembers = (state.teamMembers || []).filter(x => x.id !== id);
  save();
}

// Define/limpa o líder do time (teams.leader_id). Gera timeline quando há líder novo.
export async function setTeamLeader(teamId, stickId) {
  if (!SB || !ORG_ID || !isUuid(teamId)) return;
  const val = isUuid(stickId) ? stickId : null;
  const { error } = await SB.from("teams").update({ leader_id: val }).eq("id", teamId);
  if (error) { console.warn("setTeamLeader:", error.message); return; }
  const ex = (state.teams || []).find(x => x.id === teamId);
  if (ex) ex.leader_id = val;
  if (val) { const team = ex || {}; await addTimeline(val, "team_leader_set", "Passou a liderar", team.name ? ("Líder do time " + team.name) : "Líder de um time"); }
  save();
}
