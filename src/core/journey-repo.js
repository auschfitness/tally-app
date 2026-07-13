// Repositório da entidade Journey (Step 4 · Fase 1). Liga cada Stick ao seu
// estágio na journey padrão da org, via a tabela `stick_journey_records`
// (fonte durável: estágio atual, anterior, histórico), e mantém `p.journeyStage`
// (o código que as telas já usam) sincronizado.
//
// Cuidados:
//  1. RLS x org_id: SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID.
//  2. A journey padrão SEMPRE existe (o create_org semeia; backfill do banco já
//     rodou). Só criamos os `stick_journey_records` que faltam (por Stick).
//  3. Estágio ⇄ código do app pela `position` (1:1 com a const JOURNEY em helpers).
//  4. Toda MUDANÇA de estágio gera `timeline_events` (memória da igreja). O
//     backfill inicial NÃO gera timeline (não é mudança, é migração do que já era).
//  5. Estágio é movimento operacional — nunca score/ranking espiritual.

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";
import { JOURNEY, journeyIndex } from "./helpers.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }

// código do app -> id do estágio (via position). null se a journey não carregou.
export function stageIdForCode(code) {
  const j = state.journey; if (!j || !j.stages) return null;
  const pos = journeyIndex(code) + 1;
  const st = j.stages.find(s => s.position === pos);
  return st ? st.id : null;
}
// id do estágio -> código do app (via position).
function codeForStageId(id) {
  const j = state.journey; if (!j || !j.stages) return null;
  const st = j.stages.find(s => s.id === id);
  if (!st) return null;
  const row = JOURNEY[st.position - 1];
  return row ? row[0] : null;
}

// Carrega a journey padrão + estágios pro state, garante um registro por Stick
// (backfill quieto) e sincroniza `p.journeyStage` a partir do registro. Nunca rejeita.
export async function hydrateJourney(st) {
  try {
    if (!SB || !ORG_ID) return;
    const jr = await SB.from("journeys").select("id,name,description").eq("is_default", true).maybeSingle();
    if (jr.error) { console.warn("hydrateJourney(journey):", jr.error.message); return; }
    if (!jr.data) { console.warn("hydrateJourney: journey padrão ausente (inesperado)"); return; }
    const journey = jr.data;

    const sres = await SB.from("journey_stages").select("id,name,position,description,color").eq("journey_id", journey.id).order("position", { ascending: true });
    if (sres.error) { console.warn("hydrateJourney(stages):", sres.error.message); return; }
    st.journey = { id: journey.id, name: journey.name, stages: sres.data || [] };

    const rres = await SB.from("stick_journey_records").select("stick_id,current_stage_id,entered_stage_at").eq("journey_id", journey.id);
    if (rres.error) { console.warn("hydrateJourney(records):", rres.error.message); return; }
    const recByStick = {};
    (rres.data || []).forEach(r => { recByStick[r.stick_id] = r; });

    // backfill: cria o registro que falta a partir do journeyStage atual da Stick
    const toInsert = [];
    (st.people || []).forEach(p => {
      if (!isUuid(p.id) || recByStick[p.id]) return;
      const stageId = stageIdForCode(p.journeyStage);
      if (stageId) toInsert.push({ org_id: ORG_ID, stick_id: p.id, journey_id: journey.id, current_stage_id: stageId, completed_stages: [] });
    });
    if (toInsert.length) {
      const ins = await SB.from("stick_journey_records").insert(toInsert).select("stick_id,current_stage_id,entered_stage_at");
      if (ins.error) console.warn("hydrateJourney(backfill):", ins.error.message);
      else (ins.data || []).forEach(r => { recByStick[r.stick_id] = r; });
    }

    // sincroniza p.journeyStage a partir do registro (fonte durável) e expõe o
    // entered_stage_at por Stick no state (o Journey Map calcula tempo-no-estágio).
    const records = {};
    (st.people || []).forEach(p => {
      const rec = recByStick[p.id];
      if (rec) {
        const code = codeForStageId(rec.current_stage_id);
        if (code) p.journeyStage = code;
        records[p.id] = { stageId: rec.current_stage_id, enteredAt: rec.entered_stage_at || null };
      }
    });
    st.journey.records = records;

    // histórico de movimento (mudanças de estágio) p/ a tendência — pode vir vazio.
    const eres = await SB.from("timeline_events").select("stick_id,occurred_at").eq("event_type", "journey_stage_change");
    if (eres.error) { console.warn("hydrateJourney(events):", eres.error.message); st.journey.events = []; }
    else st.journey.events = (eres.data || []).map(e => ({ stickId: e.stick_id, occurredAt: e.occurred_at || "" }));
  } catch (e) {
    console.warn("hydrateJourney(exceção):", e && e.message);
  }
}

// Move a Stick para um estágio na journey padrão: upsert do registro
// (previous_stage_id, entered_stage_at, completed_stages) + timeline_event, e
// mantém `sticks.journey_stage_id` coerente. Sem login, é no-op.
export async function setStickStage(stickId, stageId) {
  if (!SB || !ORG_ID || !isUuid(stickId) || !isUuid(stageId)) return;
  const j = state.journey; if (!j || !j.id) { console.warn("setStickStage: journey não carregada"); return; }

  const cur = await SB.from("stick_journey_records").select("current_stage_id,completed_stages").eq("stick_id", stickId).eq("journey_id", j.id).maybeSingle();
  const prevStage = cur.data ? cur.data.current_stage_id : null;
  const completed = (cur.data && cur.data.completed_stages) ? cur.data.completed_stages.slice() : [];
  if (prevStage && prevStage !== stageId && completed.indexOf(prevStage) < 0) completed.push(prevStage);

  const row = {
    org_id: ORG_ID, stick_id: stickId, journey_id: j.id,
    current_stage_id: stageId, previous_stage_id: prevStage || null,
    entered_stage_at: nowIso(), completed_stages: completed, updated_at: nowIso(),
  };
  const up = await SB.from("stick_journey_records").upsert(row, { onConflict: "stick_id,journey_id" });
  if (up.error) { console.warn("setStickStage(upsert):", up.error.message); return; }

  await SB.from("sticks").update({ journey_stage_id: stageId }).eq("id", stickId);

  if (prevStage !== stageId) {
    const label = (j.stages.find(s => s.id === stageId) || {}).name || codeForStageId(stageId) || "novo estágio";
    const tl = await SB.from("timeline_events").insert({
      org_id: ORG_ID, stick_id: stickId, event_type: "journey_stage_change", source_module: "journey",
      title: "Mudou de estágio na Journey", summary: "Entrou em " + label, occurred_at: nowIso(),
      metadata: { to_stage_id: stageId, from_stage_id: prevStage || null },
    });
    if (tl.error) console.warn("setStickStage(timeline):", tl.error.message);
  }

  const p = (state.people || []).find(x => x.id === stickId);
  if (p) { const code = codeForStageId(stageId); if (code) { p.journeyStage = code; save(); } }
}

// CRUD de estágios da journey padrão — base para estágios customizáveis (a UI
// vem em fase seguinte; a API relacional já fica pronta e testável aqui).
export async function upsertStage(stage) {
  if (!SB || !ORG_ID) return stage && stage.id;
  const j = state.journey; if (!j || !j.id) return stage && stage.id;
  const row = { org_id: ORG_ID, journey_id: j.id, name: stage.name, position: stage.position, description: stage.description || null, color: stage.color || null };
  if (isUuid(stage.id)) {
    const { error } = await SB.from("journey_stages").update(row).eq("id", stage.id);
    if (error) console.warn("upsertStage(update):", error.message);
    return stage.id;
  }
  const { data, error } = await SB.from("journey_stages").insert(row).select("id").single();
  if (error || !data) { console.warn("upsertStage(insert):", error && error.message); return stage.id; }
  return data.id;
}
export async function deleteStage(id) {
  if (!SB || !ORG_ID || !isUuid(id)) return;
  const { error } = await SB.from("journey_stages").delete().eq("id", id);
  if (error) console.warn("deleteStage:", error.message);
}
