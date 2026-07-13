// Repositório de Sermões (Step 5 · Fase 1 — Study). O corpo do sermão é um
// DOCUMENTO em `content` jsonb (seções: outline, notes, illustrations, application,
// prayer_response, references, media). `main_passage` e `big_idea` são colunas próprias.
// Sem IA nesta fase — só leitura/escrita do que o pastor edita.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE com org_id = ORG_ID (org_id direto).

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

const STATUS = ["draft", "preparing", "ready", "preached", "archived"];
const VIS = ["private", "leadership", "church", "public"];
function statusOr(v) { return STATUS.indexOf(v) >= 0 ? v : "draft"; }
function visOr(v) { return VIS.indexOf(v) >= 0 ? v : "church"; }

// campus é NOME no app, campus_id é uuid na tabela → resolve nos dois sentidos.
async function campusMaps() {
  const c = await SB.from("campuses").select("id,name");
  const byName = {}, byId = {};
  (c.data || []).forEach(x => { byName[x.name] = x.id; byId[x.id] = x.name; });
  return { byName, byId };
}

function rowToSermon(row, maps) {
  return {
    id: row.id,
    title: row.title || "", subtitle: row.subtitle || "", description: row.description || "",
    campus: maps.byId[row.campus_id] || "", sermon_date: row.sermon_date || "",
    status: row.status || "draft", visibility: row.visibility || "church",
    main_passage: row.main_passage || "", big_idea: row.big_idea || "",
    content: row.content || {},
  };
}

function sermonToRow(s, campusId) {
  return {
    org_id: ORG_ID,
    title: s.title || "(sem título)", subtitle: s.subtitle || null, description: s.description || null,
    campus_id: campusId, sermon_date: s.sermon_date || null,
    status: statusOr(s.status), visibility: visOr(s.visibility),
    main_passage: s.main_passage || null, big_idea: s.big_idea || null,
    content: s.content || {}, updated_at: nowIso(),
  };
}

// Carrega os sermões da org (mais recentes primeiro). Nunca rejeita.
export async function hydrateSermons(st) {
  try {
    if (!SB || !ORG_ID) return;
    const maps = await campusMaps();
    const res = await SB.from("sermons").select("*")
      .order("sermon_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (res.error) { console.warn("hydrateSermons:", res.error.message); return; }
    st.sermons = (res.data || []).map(r => rowToSermon(r, maps));
  } catch (e) {
    console.warn("hydrateSermons(exceção):", e && e.message);
  }
}

// Cria um sermão. Devolve o uuid do banco (adotado no state).
export async function createSermon(s) {
  if (!SB || !ORG_ID) return null;
  const maps = await campusMaps();
  const row = sermonToRow(s, s.campus ? (maps.byName[s.campus] || null) : null);
  const { data, error } = await SB.from("sermons").insert(row).select("id").single();
  if (error || !data) { console.warn("createSermon:", error && error.message); return null; }
  if (!state.sermons) state.sermons = [];
  state.sermons.unshift(Object.assign({}, s, { id: data.id }));
  save();
  return data.id;
}

// Atualiza um sermão existente.
export async function updateSermon(id, s) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const maps = await campusMaps();
  const row = sermonToRow(s, s.campus ? (maps.byName[s.campus] || null) : null);
  const { error } = await SB.from("sermons").update(row).eq("id", id);
  if (error) { console.warn("updateSermon:", error.message); return; }
  const ex = (state.sermons || []).find(x => x.id === id);
  if (ex) Object.assign(ex, s);
  save();
}
