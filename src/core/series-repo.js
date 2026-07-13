// Repositório de Séries (Step 5 · Fase 2 — Study). Uma série é uma jornada de
// ensino que agrupa sermões. Tabela `series` (single-table, org_id direto);
// o vínculo sermão↔série vive em `sermons.series_id` (FK → series, on delete set null).
// Sem IA aqui — só leitura/escrita do que o pastor organiza.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE com org_id = ORG_ID (org_id direto).

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

const STATUS = ["planning", "active", "completed", "archived"];
function statusOr(v) { return STATUS.indexOf(v) >= 0 ? v : "planning"; }

function rowToSeries(row) {
  return {
    id: row.id,
    title: row.title || "", description: row.description || "", theme: row.theme || "",
    cover_image: row.cover_image || "",
    start_date: row.start_date || "", end_date: row.end_date || "",
    status: row.status || "active",
  };
}

function seriesToRow(s) {
  return {
    org_id: ORG_ID,
    title: s.title || "(sem título)",
    description: s.description || null, theme: s.theme || null,
    cover_image: s.cover_image || null,
    start_date: s.start_date || null, end_date: s.end_date || null,
    status: statusOr(s.status),
  };
}

// Carrega as séries da org (mais recentes/planejadas primeiro). Nunca rejeita.
export async function hydrateSeries(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("series").select("*")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) { console.warn("hydrateSeries:", res.error.message); return; }
    st.series = (res.data || []).map(rowToSeries);
  } catch (e) {
    console.warn("hydrateSeries(exceção):", e && e.message);
  }
}

// Cria uma série. Devolve o uuid do banco (adotado no state).
export async function createSeries(s) {
  if (!SB || !ORG_ID) return null;
  const { data, error } = await SB.from("series").insert(seriesToRow(s)).select("id").single();
  if (error || !data) { console.warn("createSeries:", error && error.message); return null; }
  if (!state.series) state.series = [];
  state.series.unshift(Object.assign({}, rowToSeries(seriesToRow(s)), { id: data.id }));
  save();
  return data.id;
}

// Atualiza uma série existente.
export async function updateSeries(id, s) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("series").update(seriesToRow(s)).eq("id", id);
  if (error) { console.warn("updateSeries:", error.message); return; }
  const ex = (state.series || []).find(x => x.id === id);
  if (ex) Object.assign(ex, rowToSeries(seriesToRow(s)), { id: id });
  save();
}

// Vincula (ou desvincula, seriesId=null) um sermão a uma série. Atualiza sermons.series_id.
export async function setSermonSeries(sermonId, seriesId) {
  if (!SB || !ORG_ID || !isUuid(sermonId)) return;
  const val = isUuid(seriesId) ? seriesId : null;
  const { error } = await SB.from("sermons")
    .update({ series_id: val, updated_at: new Date().toISOString() }).eq("id", sermonId);
  if (error) { console.warn("setSermonSeries:", error.message); return; }
  const ex = (state.sermons || []).find(x => x.id === sermonId);
  if (ex) ex.series_id = val;
  save();
}
