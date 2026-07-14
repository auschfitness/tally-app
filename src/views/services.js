// Cultos — Serviços (Step 6 · Fase 1). Um Service é um culto recorrente (Domingo 9h,
// Quarta de oração, Jovens). Aqui: CRUD de cultos + detalhe com as ocorrências de
// presença (attendance_sessions) ligadas àquele culto. Dashboard de presença vem na
// Fase 2. Campus-aware. Vazio honesto; nada de planilha.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc, ageOf } from "../core/helpers.js";
import { createService, updateService, deleteService } from "../core/services-repo.js";
import { planFor, createPlanItem, updatePlanItem, deletePlanItem, movePlanItem } from "../core/service-plan-repo.js";
import { checkinModal } from "./sticks.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

var WD = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
var WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
var PATTERN_LBL = { weekly: "Semanal", monthly: "Mensal", custom: "Personalizado" };

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function chk(id) { var el = document.getElementById(id); return el ? el.checked : false; }
function serviceById(id) { return (state.services || []).find(function (x) { return x.id === id; }) || null; }
function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (sel === k ? " selected" : "") + '>' + map[k] + '</option>'; }).join(""); }
function sessionsOf(id) { return (state.sessions || []).filter(function (s) { return s.service === id; }); }
function brDate(d) { return d ? d.split("-").reverse().join("/") : ""; }
function whenLabel(s) {
  var parts = [];
  if (s.weekday !== null && s.weekday !== undefined) parts.push(WD[s.weekday]);
  if (s.start_time) parts.push(s.start_time + (s.end_time ? "–" + s.end_time : ""));
  return parts.join(" · ") || "sem horário definido";
}

export function viewServices() {
  if (state.serviceDetail) return serviceDetailView(state.serviceDetail);
  var all = (state.services || []).filter(function (s) { return !s.campus || s.campus === state.activeCampus; });
  var cards = all.slice().sort(function (a, b) {
    var wa = a.weekday == null ? 9 : a.weekday, wb = b.weekday == null ? 9 : b.weekday;
    if (wa !== wb) return wa - wb;
    return (a.start_time || "").localeCompare(b.start_time || "");
  }).map(function (s) {
    var n = sessionsOf(s.id).length;
    return '<button class="gcard" data-servicedetail="' + s.id + '"><div class="gc-top"><span class="gc-name">' + esc(s.name || "(sem nome)") + '</span><span class="hb ' + (s.active ? "healthy" : "risk") + '">' + (s.active ? "Ativo" : "Inativo") + '</span></div><div class="gc-sub">' + esc(whenLabel(s)) + (s.type ? ' · ' + esc(s.type) : '') + '</div>' + '<div class="gc-foot">' + (s.location ? esc(s.location) + ' · ' : '') + n + ' ocorrência' + (n !== 1 ? 's' : '') + ' registrada' + (n !== 1 ? 's' : '') + '</div></button>';
  }).join("") || '<div class="empty">Nenhum culto ainda. Cadastre os cultos recorrentes da igreja (ex.: Domingo 9h, Quarta de oração) em “+ Novo culto”.</div>';

  return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px"><div><h1 class="page">Cultos</h1><p class="sub" style="margin:0">Os encontros recorrentes da igreja. Cada culto gera presença real e alimenta o resto do Tally.</p></div><button class="btn" id="newService" style="margin-left:auto">+ Novo culto</button></div>' +
    '<div class="gcards">' + cards + '</div>';
}

// Composição de uma sessão (só dado real). Crianças por data de nascimento conhecida.
function stickOf(id) { return (state.people || []).find(function (p) { return p.id === id; }) || null; }
function composition(sess) {
  var c = { total: 0, visitors: 0, first: 0, returning: 0, kids: 0 };
  (sess.attendees || []).forEach(function (aid) {
    c.total++;
    var p = stickOf(aid); if (!p) return;
    if (p.relationship === "visitor_first") { c.visitors++; c.first++; }
    else if (p.relationship === "visitor_returning") { c.visitors++; c.returning++; }
    var age = ageOf(p); if (age !== null && age < 12) c.kids++;
  });
  return c;
}
// Tendência: barras inline (altura ∝ contagem) das últimas N ocorrências. Sem Chart.js.
function trendBars(sessAsc, n) {
  var last = sessAsc.slice(-n);
  var max = last.reduce(function (m, s) { return Math.max(m, (s.attendees || []).length); }, 0) || 1;
  return '<div style="display:flex;align-items:flex-end;gap:5px;height:90px;margin:6px 0 4px">' + last.map(function (s) {
    var v = (s.attendees || []).length; var h = Math.round(v / max * 78) + 2;
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%"><span class="muted" style="font-size:10px">' + v + '</span><div title="' + esc(brDate(s.date)) + '" style="width:100%;max-width:26px;height:' + h + 'px;background:var(--blue);border-radius:4px 4px 0 0"></div><span class="muted" style="font-size:9px;margin-top:3px">' + (s.date ? brDate(s.date).slice(0, 5) : '—') + '</span></div>';
  }).join("") + '</div>';
}

function serviceDetailView(id) {
  var s = serviceById(id);
  if (!s) return '<button class="link" id="servicesBack">&#8592; Voltar aos cultos</button><div class="empty">Culto não encontrado.</div>';
  var sess = sessionsOf(id).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  var sessAsc = sess.slice().reverse();

  // Painel de presença: tendência (12) + composição da última ocorrência.
  var presence;
  if (sess.length) {
    var latest = sess[0]; var c = composition(latest);
    var comp = '<div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:10px">' +
      '<span><b style="color:var(--blue);font-size:16px">' + c.total + '</b> <span class="muted">presentes (última)</span></span>' +
      '<span><b>' + c.visitors + '</b> <span class="muted">visitantes</span></span>' +
      '<span><b>' + c.first + '</b> <span class="muted">1ª vez</span></span>' +
      '<span><b>' + c.returning + '</b> <span class="muted">retornando</span></span>' +
      '<span><b>' + c.kids + '</b> <span class="muted">crianças</span></span></div>';
    presence = '<div class="ph"><h3>Presença</h3><span class="muted" style="margin-left:auto">últimas ' + Math.min(12, sess.length) + ' ocorrências</span></div>' + trendBars(sessAsc, 12) + comp;
  } else {
    presence = '<div class="ph"><h3>Presença</h3></div><div class="empty">Sem ocorrências ainda. Registre a presença de um culto para ver a tendência.</div>';
  }

  var sessList = sess.slice(0, 8).map(function (x) {
    var n = (x.attendees || []).length;
    return '<div class="li"><div class="av">' + (x.date ? brDate(x.date).slice(0, 5) : '—') + '</div><div style="flex:1"><div><b>' + (x.date ? brDate(x.date) : 'sem data') + '</b></div><div class="meta">' + n + ' presente' + (n !== 1 ? 's' : '') + '</div></div></div>';
  }).join("") || '<div class="empty">Nenhuma presença registrada neste culto ainda. Use “Registrar presença”.</div>';

  // Ordem do culto (service_plan_items — template do serviço).
  var plan = planFor(id);
  var planList = plan.map(function (it, i) {
    var right = '<button class="link" data-planup="' + it.id + '"' + (i === 0 ? ' style="visibility:hidden"' : '') + '>↑</button><button class="link" data-plandown="' + it.id + '"' + (i === plan.length - 1 ? ' style="visibility:hidden"' : '') + '>↓</button><button class="link" data-planedit="' + it.id + '">editar</button><button class="link" data-plandel="' + it.id + '">×</button>';
    var meta = [];
    if (it.duration_min) meta.push(it.duration_min + " min");
    if (it.responsible) meta.push(esc(it.responsible));
    return '<div class="li"><div class="av">' + (it.time_label ? esc(it.time_label) : (i + 1)) + '</div><div style="flex:1"><div><b>' + esc(it.title) + '</b></div>' + (meta.length ? '<div class="meta">' + meta.join(" · ") + '</div>' : '') + '</div><div class="right">' + right + '</div></div>';
  }).join("") || '<div class="empty">Sem ordem definida. Monte a sequência do culto (louvor, avisos, mensagem…).</div>';

  var info = '<div class="field"><label>Quando</label><div>' + esc(whenLabel(s)) + ' · ' + (PATTERN_LBL[s.recurring_pattern] || s.recurring_pattern) + '</div></div>' +
    (s.location ? '<div class="field"><label>Local</label><div>' + esc(s.location) + '</div></div>' : '') +
    (s.campus ? '<div class="field"><label>Campus</label><div>' + esc(s.campus) + '</div></div>' : '') +
    (s.description ? '<div class="field"><label>Sobre</label><div>' + esc(s.description) + '</div></div>' : '');

  // Conexões (Fase 3): sermões pregados neste culto (Study) + times escalados (Teams).
  var serm = (state.sermons || []).filter(function (x) { return x.service_id === id; });
  var sermList = serm.map(function (x) {
    return '<button class="li" data-svcsermon="' + x.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>' + esc(x.title || "(sem título)") + '</b>' + (x.main_passage ? ' <span class="muted">· ' + esc(x.main_passage) + '</span>' : '') + '</div></button>';
  }).join("") || '<div class="empty">Nenhum sermão vinculado a este culto. Vincule no editor do sermão (Propriedades → Culto).</div>';

  var assigns = (state.schedule || []).filter(function (a) { return a.service_id === id; });
  var teamNames = {}; (state.teams || []).forEach(function (tm) { teamNames[tm.id] = tm.name; });
  var svcPeople = {}; (state.people || []).forEach(function (p) { svcPeople[p.id] = p.name; });
  var assignList = assigns.map(function (a) {
    return '<div class="li"><div style="flex:1"><b>' + esc(teamNames[a.team_id] || "Time") + '</b>' + (a.role ? ' <span class="muted">· ' + esc(a.role) + '</span>' : '') + (a.stick_id ? ' <span class="muted">· ' + esc(svcPeople[a.stick_id] || "—") + '</span>' : '') + '</div></div>';
  }).join("") || '<div class="empty">Nenhum time escalado para este culto ainda. A escala por time vive em Times › Escala.</div>';

  return '<button class="link" id="servicesBack">&#8592; Voltar aos cultos</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(s.name || "(sem nome)") + '</h1><p class="sub" style="margin:0">' + esc(whenLabel(s)) + (s.type ? ' · ' + esc(s.type) : '') + (s.active ? '' : ' · Inativo') + '</p></div><button class="btn ghost" id="editService" data-service="' + id + '" style="margin-left:auto">Editar culto</button><button class="btn" id="serviceCheckin" data-service="' + id + '">Registrar presença</button></div>' +
    '<div class="panel" style="margin-bottom:16px">' + presence + '</div>' +
    '<div class="row2"><div class="panel"><div class="ph"><h3>Ordem do culto</h3><button class="btn ghost sm" id="addPlanItem" data-service="' + id + '" style="margin-left:auto">+ Item</button></div>' + planList + '</div>' +
    '<div class="panel"><div class="ph"><h3>Presenças recentes</h3><span class="muted" style="margin-left:auto">' + sess.length + ' ocorrência' + (sess.length !== 1 ? 's' : '') + '</span></div>' + sessList + '<div style="margin-top:14px" class="ph"><h3>Sobre o culto</h3></div>' + info + '</div></div>' +
    '<div class="row2" style="margin-top:16px"><div class="panel"><div class="ph"><h3>Ensino deste culto</h3><span class="muted" style="margin-left:auto">' + serm.length + ' sermã' + (serm.length === 1 ? 'o' : 'os') + '</span></div>' + sermList + '</div>' +
    '<div class="panel"><div class="ph"><h3>Times escalados</h3></div>' + assignList + '</div></div>';
}

function planItemModal(serviceId, it) {
  var isNew = !it; it = it || {};
  openModal('<h3>' + (isNew ? 'Novo item da ordem' : 'Editar item') + '</h3>' +
    '<div class="mrow"><div class="field"><label>Horário</label><input id="pl-time" value="' + esc(it.time_label || "") + '" placeholder="Ex.: 09:00"></div><div class="field"><label>Duração (min)</label><input id="pl-dur" type="number" min="0" value="' + (it.duration_min != null ? it.duration_min : "") + '"></div></div>' +
    '<div class="field"><label>Título</label><input id="pl-title" value="' + esc(it.title || "") + '" placeholder="Ex.: Louvor, Avisos, Mensagem"></div>' +
    '<div class="field"><label>Responsável</label><input id="pl-resp" value="' + esc(it.responsible || "") + '" placeholder="Opcional"></div>' +
    '<div class="field"><label>Notas</label><textarea id="pl-notes" rows="2" placeholder="Opcional">' + esc(it.notes || "") + '</textarea></div>' +
    '<div class="actions"><button class="btn ghost" id="pl-cancel">Cancelar</button><button class="btn" id="pl-save" data-id="' + (it.id || "") + '" data-service="' + serviceId + '">' + (isNew ? 'Adicionar' : 'Salvar') + '</button></div>');
  document.getElementById("pl-cancel").onclick = closeModal;
  document.getElementById("pl-save").onclick = function () {
    var title = val("pl-title").trim(); if (!title) { var el = document.getElementById("pl-title"); if (el) el.focus(); return; }
    var data = { time_label: val("pl-time").trim(), duration_min: val("pl-dur"), title: title, responsible: val("pl-resp").trim(), notes: val("pl-notes").trim() };
    var pid = this.getAttribute("data-id");
    if (pid) updatePlanItem(pid, data).then(function () { closeModal(); render(); });
    else { data.service_id = this.getAttribute("data-service"); createPlanItem(data).then(function () { closeModal(); render(); }); }
  };
}

function serviceModal(s) {
  var isNew = !s; s = s || { active: true, recurring_pattern: "weekly", campus: state.activeCampus };
  var campusSel = '<select id="sv-campus">' + state.institution.campuses.map(function (c) { return '<option' + (s.campus === c ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("") + '</select>';
  var wdSel = '<select id="sv-weekday"><option value="">—</option>' + WD.map(function (w, i) { return '<option value="' + i + '"' + (s.weekday === i ? " selected" : "") + '>' + w + '</option>'; }).join("") + '</select>';
  openModal('<h3>' + (isNew ? 'Novo culto' : 'Editar culto') + '</h3>' +
    '<div class="field"><label>Nome</label><input id="sv-name" value="' + esc(s.name || "") + '" placeholder="Ex.: Culto de Domingo"></div>' +
    '<div class="mrow"><div class="field"><label>Tipo</label><input id="sv-type" value="' + esc(s.type || "") + '" placeholder="Ex.: Domingo, Oração, Jovens"></div><div class="field"><label>Campus</label>' + campusSel + '</div></div>' +
    '<div class="mrow"><div class="field"><label>Dia da semana</label>' + wdSel + '</div><div class="field"><label>Recorrência</label><select id="sv-pattern">' + opts(PATTERN_LBL, s.recurring_pattern || "weekly") + '</select></div></div>' +
    '<div class="mrow"><div class="field"><label>Início</label><input id="sv-start" type="time" value="' + esc(s.start_time || "") + '"></div><div class="field"><label>Fim</label><input id="sv-end" type="time" value="' + esc(s.end_time || "") + '"></div></div>' +
    '<div class="field"><label>Local</label><input id="sv-loc" value="' + esc(s.location || "") + '" placeholder="Ex.: Templo, Salão"></div>' +
    '<div class="field"><label>Descrição</label><textarea id="sv-desc" rows="2" placeholder="Opcional">' + esc(s.description || "") + '</textarea></div>' +
    '<div class="field check"><input type="checkbox" id="sv-active"' + (s.active !== false ? " checked" : "") + '><label>Culto ativo</label></div>' +
    '<div class="actions">' + (isNew ? '' : '<button class="btn ghost" id="sv-del" data-id="' + s.id + '" style="margin-right:auto;color:var(--danger,#c0392b)">Excluir</button>') + '<button class="btn ghost" id="sv-cancel">Cancelar</button><button class="btn" id="sv-save" data-id="' + (s.id || "") + '">' + (isNew ? 'Criar culto' : 'Salvar') + '</button></div>');
  document.getElementById("sv-cancel").onclick = closeModal;
  var del = document.getElementById("sv-del");
  if (del) del.onclick = function () { if (!window.confirm("Excluir este culto? As presenças registradas continuam, mas sem vínculo com o culto.")) return; deleteService(this.getAttribute("data-id")).then(function () { closeModal(); state.serviceDetail = null; render(); }); };
  document.getElementById("sv-save").onclick = function () {
    var name = val("sv-name").trim(); if (!name) { var el = document.getElementById("sv-name"); if (el) el.focus(); return; }
    var data = { name: name, type: val("sv-type").trim(), campus: val("sv-campus"), weekday: val("sv-weekday"), recurring_pattern: val("sv-pattern"), start_time: val("sv-start"), end_time: val("sv-end"), location: val("sv-loc").trim(), description: val("sv-desc").trim(), active: chk("sv-active") };
    var id = this.getAttribute("data-id");
    if (id) updateService(id, data).then(function () { closeModal(); render(); });
    else createService(data).then(function (nid) { closeModal(); if (nid) state.serviceDetail = nid; save(); render(); });
  };
}

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-servicedetail],[data-svcsermon],[data-planedit],[data-plandel],[data-planup],[data-plandown],#newService,#servicesBack,#editService,#serviceCheckin,#addPlanItem") : null; if (!t) return;
  if (t.getAttribute("data-servicedetail")) { state.serviceDetail = t.getAttribute("data-servicedetail"); save(); render(); return; }
  if (t.getAttribute("data-svcsermon")) { state.view = "sermons"; state.studyTab = "library"; state.seriesDetail = null; state.scriptureMap = false; state.serviceDetail = null; state.sermonEdit = t.getAttribute("data-svcsermon"); save(); render(); return; }
  if (t.getAttribute("data-planedit")) { var pe = (state.planItems || []).find(function (x) { return x.id === t.getAttribute("data-planedit"); }); if (pe) planItemModal(pe.service_id, pe); return; }
  if (t.getAttribute("data-plandel")) { if (!window.confirm("Remover este item da ordem?")) return; deletePlanItem(t.getAttribute("data-plandel")).then(function () { render(); }); return; }
  if (t.getAttribute("data-planup")) { movePlanItem(t.getAttribute("data-planup"), -1).then(function () { render(); }); return; }
  if (t.getAttribute("data-plandown")) { movePlanItem(t.getAttribute("data-plandown"), 1).then(function () { render(); }); return; }
  if (t.id === "addPlanItem") { planItemModal(t.getAttribute("data-service"), null); return; }
  if (t.id === "newService") { serviceModal(null); return; }
  if (t.id === "servicesBack") { state.serviceDetail = null; save(); render(); return; }
  if (t.id === "editService") { serviceModal(serviceById(t.getAttribute("data-service"))); return; }
  if (t.id === "serviceCheckin") { checkinModal(t.getAttribute("data-service")); return; }
});
