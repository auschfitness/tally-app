// Cultos — Serviços (Step 6 · Fase 1). Um Service é um culto recorrente (Domingo 9h,
// Quarta de oração, Jovens). Aqui: CRUD de cultos + detalhe com as ocorrências de
// presença (attendance_sessions) ligadas àquele culto. Dashboard de presença vem na
// Fase 2. Campus-aware. Vazio honesto; nada de planilha.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc } from "../core/helpers.js";
import { createService, updateService, deleteService } from "../core/services-repo.js";
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

function serviceDetailView(id) {
  var s = serviceById(id);
  if (!s) return '<button class="link" id="servicesBack">&#8592; Voltar aos cultos</button><div class="empty">Culto não encontrado.</div>';
  var sess = sessionsOf(id).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  var sessList = sess.map(function (x) {
    var n = (x.attendees || []).length;
    return '<div class="li"><div class="av">' + (x.date ? brDate(x.date).slice(0, 5) : '—') + '</div><div style="flex:1"><div><b>' + (x.date ? brDate(x.date) : 'sem data') + '</b></div><div class="meta">' + n + ' presente' + (n !== 1 ? 's' : '') + '</div></div></div>';
  }).join("") || '<div class="empty">Nenhuma presença registrada neste culto ainda. Use “Registrar presença”.</div>';

  var info = '<div class="field"><label>Quando</label><div>' + esc(whenLabel(s)) + ' · ' + (PATTERN_LBL[s.recurring_pattern] || s.recurring_pattern) + '</div></div>' +
    (s.location ? '<div class="field"><label>Local</label><div>' + esc(s.location) + '</div></div>' : '') +
    (s.campus ? '<div class="field"><label>Campus</label><div>' + esc(s.campus) + '</div></div>' : '') +
    (s.description ? '<div class="field"><label>Sobre</label><div>' + esc(s.description) + '</div></div>' : '');

  return '<button class="link" id="servicesBack">&#8592; Voltar aos cultos</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(s.name || "(sem nome)") + '</h1><p class="sub" style="margin:0">' + esc(whenLabel(s)) + (s.type ? ' · ' + esc(s.type) : '') + (s.active ? '' : ' · Inativo') + '</p></div><button class="btn ghost" id="editService" data-service="' + id + '" style="margin-left:auto">Editar culto</button><button class="btn" id="serviceCheckin" data-service="' + id + '">Registrar presença</button></div>' +
    '<div class="row2"><div class="panel"><div class="ph"><h3>Presenças recentes</h3><span class="muted" style="margin-left:auto">' + sess.length + ' ocorrência' + (sess.length !== 1 ? 's' : '') + '</span></div>' + sessList + '</div>' +
    '<div class="panel"><div class="ph"><h3>Sobre o culto</h3></div>' + info + '</div></div>';
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
  var t = e.target.closest ? e.target.closest("[data-servicedetail],#newService,#servicesBack,#editService,#serviceCheckin") : null; if (!t) return;
  if (t.getAttribute("data-servicedetail")) { state.serviceDetail = t.getAttribute("data-servicedetail"); save(); render(); return; }
  if (t.id === "newService") { serviceModal(null); return; }
  if (t.id === "servicesBack") { state.serviceDetail = null; save(); render(); return; }
  if (t.id === "editService") { serviceModal(serviceById(t.getAttribute("data-service"))); return; }
  if (t.id === "serviceCheckin") { checkinModal(t.getAttribute("data-service")); return; }
});
