// Repositório de Notas de estudo (Step 5 · Fase 4 — Study). Tabela `study_notes`
// (org_id direto). Uma nota tem título + conteúdo livre, escopo pessoal/compartilhada,
// e vínculos opcionais leves (sermão, série, escritura, tópico) — a nota não é ilha.
// Sem IA aqui — só leitura/escrita do que o pastor escreve.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID (org_id direto).
// author_id fica null por ora (evita FK a perfis/auth vazios); o escopo é o que importa.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

const SCOPE = ["personal", "shared"];
function scopeOr(v) { return SCOPE.indexOf(v) >= 0 ? v : "personal"; }

function rowToNote(row) {
  return {
    id: row.id,
    title: row.title || "", content: row.content || "",
    scope: row.scope || "personal",
    sermon_id: row.sermon_id || null, series_id: row.series_id || null,
    scripture_ref: row.scripture_ref || "", topic: row.topic || "",
    tags: row.tags || [],
    updated_at: row.updated_at || "",
  };
}

function noteToRow(n) {
  return {
    org_id: ORG_ID,
    title: n.title || null, content: n.content || null,
    scope: scopeOr(n.scope),
    sermon_id: isUuid(n.sermon_id) ? n.sermon_id : null,
    series_id: isUuid(n.series_id) ? n.series_id : null,
    scripture_ref: n.scripture_ref || null, topic: n.topic || null,
    tags: Array.isArray(n.tags) ? n.tags : [],
    updated_at: nowIso(),
  };
}

// Carrega as notas da org (mais recentes primeiro). Nunca rejeita.
export async function hydrateNotes(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("study_notes").select("*").order("updated_at", { ascending: false });
    if (res.error) { console.warn("hydrateNotes:", res.error.message); return; }
    st.notes = (res.data || []).map(rowToNote);
  } catch (e) {
    console.warn("hydrateNotes(exceção):", e && e.message);
  }
}

// Cria uma nota. Devolve o uuid do banco (adotado no state).
export async function createNote(n) {
  if (!SB || !ORG_ID) return null;
  const { data, error } = await SB.from("study_notes").insert(noteToRow(n)).select("*").single();
  if (error || !data) { console.warn("createNote:", error && error.message); return null; }
  if (!state.notes) state.notes = [];
  state.notes.unshift(rowToNote(data));
  save();
  return data.id;
}

// Atualiza uma nota existente.
export async function updateNote(id, n) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("study_notes").update(noteToRow(n)).eq("id", id);
  if (error) { console.warn("updateNote:", error.message); return; }
  const ex = (state.notes || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToNote(Object.assign({}, noteToRow(n), { id: id })));
  save();
}

// Remove uma nota.
export async function deleteNote(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("study_notes").delete().eq("id", id);
  if (error) { console.warn("deleteNote:", error.message); return; }
  state.notes = (state.notes || []).filter(x => x.id !== id);
  save();
}
