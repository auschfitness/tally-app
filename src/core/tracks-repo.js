// Repositório de Discipleship Tracks (Step 4 · Fase 5). Trilhas de crescimento
// (tracks) com etapas relacionais (track_steps) e matrículas por Stick
// (track_enrollments). A CONCLUSÃO cria um milestone operacional + timeline_event
// e aparece na timeline da pessoa (MSTYPE.completed_track). NÃO move a Journey
// automaticamente (não há config trilha→journey; não forçar). Milestone
// espiritualmente significativo continua exigindo confirmação humana.
//
// RLS: SELECT sem filtro de org; INSERT/UPSERT com org_id = ORG_ID (org_id direto nas 3).

import { SB, ORG_ID } from "./session.js";
import { state } from "./state.js";
import { save } from "./persist.js";
import { iso, today } from "./helpers.js";

function isUuid(s) { return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function nowIso() { return new Date().toISOString(); }
function sortedSteps(t) { return (t && t.steps ? t.steps.slice() : []).sort(function (a, b) { return a.position - b.position; }); }

// Carrega trilhas + etapas (por position) + matrículas da org para o state.
export async function hydrateTracks(st) {
  try {
    if (!SB || !ORG_ID) return;
    const [tr, ts, en] = await Promise.all([
      SB.from("tracks").select("*"),
      SB.from("track_steps").select("*").order("position", { ascending: true }),
      SB.from("track_enrollments").select("*"),
    ]);
    if (tr.error) { console.warn("hydrateTracks(tracks):", tr.error.message); return; }
    if (ts.error) { console.warn("hydrateTracks(steps):", ts.error.message); }
    const byTrack = {};
    (ts.data || []).forEach(s => { (byTrack[s.track_id] = byTrack[s.track_id] || []).push(s); });
    st.tracks = (tr.data || []).map(t => Object.assign({}, t, { steps: byTrack[t.id] || [] }));
    st.trackEnrollments = en.data || [];
  } catch (e) {
    console.warn("hydrateTracks(exceção):", e && e.message);
  }
}

// Cria uma trilha. Devolve o uuid do banco (adotado no state).
export async function createTrack(track) {
  if (!SB || !ORG_ID) return null;
  const { data, error } = await SB.from("tracks")
    .insert({ org_id: ORG_ID, name: track.name, description: track.description || null, type: track.type || null, status: "active" })
    .select("id").single();
  if (error || !data) { console.warn("createTrack:", error && error.message); return null; }
  if (!state.tracks) state.tracks = [];
  state.tracks.push({ id: data.id, name: track.name, description: track.description || "", type: track.type || "", status: "active", steps: [] });
  save();
  return data.id;
}

// Adiciona uma etapa ao fim da trilha (position = próxima).
export async function addStep(trackId, step) {
  if (!SB || !ORG_ID || !isUuid(trackId)) return null;
  const t = (state.tracks || []).find(x => x.id === trackId);
  const pos = (t && t.steps ? t.steps.length : 0) + 1;
  const { data, error } = await SB.from("track_steps")
    .insert({ org_id: ORG_ID, track_id: trackId, name: step.name, description: step.description || null, position: pos, materials: [] })
    .select("id").single();
  if (error || !data) { console.warn("addStep:", error && error.message); return null; }
  if (t) { if (!t.steps) t.steps = []; t.steps.push({ id: data.id, track_id: trackId, name: step.name, description: step.description || "", position: pos, materials: [] }); save(); }
  return data.id;
}

// Matricula uma Stick numa trilha (começa na 1ª etapa). Idempotente (UNIQUE track+stick).
export async function enroll(stickId, trackId) {
  if (!SB || !ORG_ID || !isUuid(stickId) || !isUuid(trackId)) return null;
  const t = (state.tracks || []).find(x => x.id === trackId);
  const steps = sortedSteps(t);
  const first = steps.length ? steps[0].id : null;
  const row = { org_id: ORG_ID, track_id: trackId, stick_id: stickId, current_step_id: first, progress: 0, status: "in_progress", started_at: nowIso() };
  const { data, error } = await SB.from("track_enrollments").upsert(row, { onConflict: "track_id,stick_id" }).select("id").single();
  if (error || !data) { console.warn("enroll:", error && error.message); return null; }
  if (!state.trackEnrollments) state.trackEnrollments = [];
  const ex = state.trackEnrollments.find(e => e.track_id === trackId && e.stick_id === stickId);
  if (ex) { ex.id = data.id; ex.current_step_id = first; ex.progress = 0; ex.status = "in_progress"; ex.completed_at = null; }
  else state.trackEnrollments.push({ id: data.id, track_id: trackId, stick_id: stickId, current_step_id: first, progress: 0, status: "in_progress", started_at: nowIso(), completed_at: null });
  save();
  return data.id;
}

// Avança a matrícula para a próxima etapa; se era a última, conclui.
export async function advanceStep(enrollmentId) {
  if (!SB || !ORG_ID) return;
  const en = (state.trackEnrollments || []).find(e => e.id === enrollmentId);
  if (!en || en.status === "completed") return;
  const t = (state.tracks || []).find(x => x.id === en.track_id);
  const steps = sortedSteps(t);
  if (!steps.length) return;
  const curIdx = steps.findIndex(s => s.id === en.current_step_id);
  const nextIdx = curIdx + 1;
  if (nextIdx >= steps.length) { await completeEnrollment(en, t, steps.length); return; }
  const nextStep = steps[nextIdx];
  const progress = Math.round((nextIdx / steps.length) * 100);
  const upd = await SB.from("track_enrollments").update({ current_step_id: nextStep.id, progress: progress, updated_at: nowIso() }).eq("id", en.id);
  if (upd.error) { console.warn("advanceStep:", upd.error.message); return; }
  en.current_step_id = nextStep.id; en.progress = progress; save();
}

// Conclusão: status='completed' + milestone operacional + timeline_event, e mostra
// na timeline da pessoa. Journey NÃO é movida (sem config; não forçar).
async function completeEnrollment(en, t, total) {
  const upd = await SB.from("track_enrollments").update({ status: "completed", completed_at: nowIso(), progress: 100, updated_at: nowIso() }).eq("id", en.id);
  if (upd.error) { console.warn("completeEnrollment:", upd.error.message); return; }
  en.status = "completed"; en.completed_at = nowIso(); en.progress = 100;
  const trackName = (t && t.name) || "trilha";
  const ms = await SB.from("milestones").insert({ org_id: ORG_ID, stick_id: en.stick_id, occurred_on: iso(today()), code: "completed_track", title: "Concluiu a trilha " + trackName, source_module: "tracks", source_record_id: en.id });
  if (ms.error) console.warn("completeEnrollment(milestone):", ms.error.message);
  const tl = await SB.from("timeline_events").insert({ org_id: ORG_ID, stick_id: en.stick_id, event_type: "track_completed", source_module: "tracks", source_record_id: en.id, title: "Concluiu uma trilha", summary: "Concluiu " + trackName, occurred_at: nowIso() });
  if (tl.error) console.warn("completeEnrollment(timeline):", tl.error.message);
  // visível na UI atual (MSTYPE.completed_track): entra na timeline da pessoa
  const p = (state.people || []).find(x => x.id === en.stick_id);
  if (p) { if (!p.milestones) p.milestones = []; p.milestones.push({ type: "completed_track", date: iso(today()) }); }
  save();
}
