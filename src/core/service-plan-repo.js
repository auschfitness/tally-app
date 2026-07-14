// Repositório da Ordem do culto (Step 6 · Fase 2). Tabela `service_plan_items`
// (org_id direto): a sequência de um culto — momentos com horário, título, duração,
// responsável. Template do culto = itens com service_id preenchido (session_id null).
// Aplicar a uma ocorrência específica (session_id) fica para uma rodada futura.
//
// RLS: SELECT sem filtro de org; INSERT/UPDATE/DELETE com org_id = ORG_ID.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }

function rowToItem(row) {
  return {
    id: row.id, service_id: row.service_id || null, session_id: row.session_id || null,
    position: row.position || 1, time_label: row.time_label || "", title: row.title || "",
    duration_min: (row.duration_min === null || row.duration_min === undefined) ? null : row.duration_min,
    responsible: row.responsible || "", notes: row.notes || "",
  };
}
function itemToRow(it) {
  return {
    org_id: ORG_ID,
    service_id: isUuid(it.service_id) ? it.service_id : null,
    session_id: isUuid(it.session_id) ? it.session_id : null,
    position: it.position || 1, time_label: it.time_label || null,
    title: it.title || "(sem título)",
    duration_min: (it.duration_min === "" || it.duration_min == null) ? null : parseInt(it.duration_min, 10),
    responsible: it.responsible || null, notes: it.notes || null,
  };
}

// Carrega todos os itens de ordem de culto da org. Nunca rejeita.
export async function hydratePlanItems(st) {
  try {
    if (!SB || !ORG_ID) return;
    const res = await SB.from("service_plan_items").select("*").order("position", { ascending: true });
    if (res.error) { console.warn("hydratePlanItems:", res.error.message); return; }
    st.planItems = (res.data || []).map(rowToItem);
  } catch (e) {
    console.warn("hydratePlanItems(exceção):", e && e.message);
  }
}

// Itens (ordenados) de um serviço-template.
export function planFor(serviceId) {
  return (state.planItems || []).filter(function (x) { return x.service_id === serviceId && !x.session_id; })
    .slice().sort(function (a, b) { return a.position - b.position; });
}

export async function createPlanItem(it) {
  if (!SB || !ORG_ID || !isUuid(it.service_id)) return null;
  // próxima position no fim do template
  const existing = planFor(it.service_id);
  it.position = existing.length ? (existing[existing.length - 1].position + 1) : 1;
  const { data, error } = await SB.from("service_plan_items").insert(itemToRow(it)).select("*").single();
  if (error || !data) { console.warn("createPlanItem:", error && error.message); return null; }
  if (!state.planItems) state.planItems = [];
  state.planItems.push(rowToItem(data));
  save();
  return data.id;
}

export async function updatePlanItem(id, patch) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const ex = (state.planItems || []).find(function (x) { return x.id === id; });
  const merged = Object.assign({}, ex, patch);
  const { error } = await SB.from("service_plan_items").update(itemToRow(merged)).eq("id", id);
  if (error) { console.warn("updatePlanItem:", error.message); return; }
  if (ex) Object.assign(ex, rowToItem(Object.assign({}, itemToRow(merged), { id: id })));
  save();
}

export async function deletePlanItem(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("service_plan_items").delete().eq("id", id);
  if (error) { console.warn("deletePlanItem:", error.message); return; }
  state.planItems = (state.planItems || []).filter(function (x) { return x.id !== id; });
  save();
}

// Troca a posição de um item com o vizinho (dir=-1 sobe, +1 desce) dentro do template.
export async function movePlanItem(id, dir) {
  const it = (state.planItems || []).find(function (x) { return x.id === id; });
  if (!it) return;
  const list = planFor(it.service_id);
  const idx = list.findIndex(function (x) { return x.id === id; });
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= list.length) return;
  const other = list[swapIdx];
  const a = it.position, b = other.position;
  await updatePlanItem(it.id, { position: b });
  await updatePlanItem(other.id, { position: a });
}
