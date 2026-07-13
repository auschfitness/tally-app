// Repositório de Recursos de estudo (Step 5 · Fase 4 — Study). Tabela `resources`
// (org_id direto): livros, artigos, PDFs, links, vídeos, citações que apoiam o ensino.
// Vínculo leve opcional a um sermão. Sem IA — só o acervo que a igreja organiza.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID (org_id direto).

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

const TYPES = ["book", "article", "pdf", "link", "video", "quote", "doc", "other"];
function typeOr(v) { return TYPES.indexOf(v) >= 0 ? v : "other"; }

function rowToResource(row) {
  return {
    id: row.id,
    title: row.title || "", author: row.author || "", type: row.type || "other",
    url: row.url || "", description: row.description || "", topic: row.topic || "",
    tags: row.tags || [], sermon_id: row.sermon_id || null,
  };
}

function resourceToRow(r) {
  return {
    org_id: ORG_ID,
    title: r.title || "(sem título)", author: r.author || null, type: typeOr(r.type),
    url: r.url || null, description: r.description || null, topic: r.topic || null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    sermon_id: isUuid(r.sermon_id) ? r.sermon_id : null,
  };
}

// Carrega os recursos da org (mais recentes primeiro). Nunca rejeita.
export async function hydrateResources(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("resources").select("*").order("created_at", { ascending: false });
    if (res.error) { console.warn("hydrateResources:", res.error.message); return; }
    st.resources = (res.data || []).map(rowToResource);
  } catch (e) {
    console.warn("hydrateResources(exceção):", e && e.message);
  }
}

// Cria um recurso. Devolve o uuid do banco (adotado no state).
export async function createResource(r) {
  if (!SB || !ORG_ID) return null;
  const { data, error } = await SB.from("resources").insert(resourceToRow(r)).select("*").single();
  if (error || !data) { console.warn("createResource:", error && error.message); return null; }
  if (!state.resources) state.resources = [];
  state.resources.unshift(rowToResource(data));
  save();
  return data.id;
}

// Atualiza um recurso existente.
export async function updateResource(id, r) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("resources").update(resourceToRow(r)).eq("id", id);
  if (error) { console.warn("updateResource:", error.message); return; }
  const ex = (state.resources || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToResource(Object.assign({}, resourceToRow(r), { id: id })));
  save();
}

// Remove um recurso.
export async function deleteResource(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("resources").delete().eq("id", id);
  if (error) { console.warn("deleteResource:", error.message); return; }
  state.resources = (state.resources || []).filter(x => x.id !== id);
  save();
}
