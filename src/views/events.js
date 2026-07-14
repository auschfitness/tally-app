// Eventos (Step 6 · Fase 4). Evento especial (conferência, retiro, curso) — distinto
// do culto recorrente. CRUD + inscrição/check-in INTERNOS (staff logado; sem página
// pública/pagamento, adiados). Identifica visitante sem duplicar Stick. Vazio honesto.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc, initials, relLabel } from "../core/helpers.js";
import { createEvent, updateEvent, deleteEvent, addRegistration, toggleCheckIn, removeRegistration } from "../core/events-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

var STATUS_LBL = { draft: "Rascunho", active: "Ativo", completed: "Concluído", cancelled: "Cancelado" };
var STATUS_BAND = { draft: "attention", active: "healthy", completed: "healthy", cancelled: "risk" };

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function chk(id) { var el = document.getElementById(id); return el ? el.checked : false; }
function eventById(id) { return (state.events || []).find(function (x) { return x.id === id; }) || null; }
function stickOf(id) { return (state.people || []).find(function (p) { return p.id === id; }) || null; }
function regsOf(id) { return (state.eventRegs || []).filter(function (r) { return r.event_id === id; }); }
function brDate(d) { return d ? d.split("-").reverse().join("/") : ""; }
function whenLabel(e) {
  var parts = [];
  if (e.event_date) parts.push(brDate(e.event_date));
  if (e.start_time) parts.push(e.start_time + (e.end_time ? "–" + e.end_time : ""));
  return parts.join(" · ") || "sem data definida";
}

export function viewEvents() {
  if (state.eventDetail) return eventDetailView(state.eventDetail);
  var all = (state.events || []).filter(function (e) { return !e.campus || e.campus === state.activeCampus; });
  var cards = all.map(function (e) {
    var n = regsOf(e.id).length;
    var cap = e.capacity ? (' · ' + n + '/' + e.capacity) : (n ? ' · ' + n + ' inscrito' + (n !== 1 ? 's' : '') : '');
    return '<button class="gcard" data-eventdetail="' + e.id + '"><div class="gc-top"><span class="gc-name">' + esc(e.name || "(sem nome)") + '</span><span class="hb ' + (STATUS_BAND[e.status] || "attention") + '">' + (STATUS_LBL[e.status] || e.status) + '</span></div><div class="gc-sub">' + esc(whenLabel(e)) + (e.type ? ' · ' + esc(e.type) : '') + '</div><div class="gc-foot">' + (e.location ? esc(e.location) : 'sem local') + cap + '</div></button>';
  }).join("") || '<div class="empty">Nenhum evento ainda. Cadastre conferências, retiros, cursos ou eventos especiais em “+ Novo evento”.</div>';

  return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px"><div><h1 class="page">Eventos</h1><p class="sub" style="margin:0">Encontros especiais da igreja. Inscrição e check-in são internos (a equipe registra). Página pública e pagamento chegam depois.</p></div><button class="btn" id="newEvent" style="margin-left:auto">+ Novo evento</button></div>' +
    '<div class="gcards">' + cards + '</div>';
}

function eventDetailView(id) {
  var e = eventById(id);
  if (!e) return '<button class="link" id="eventsBack">&#8592; Voltar aos eventos</button><div class="empty">Evento não encontrado.</div>';
  var regs = regsOf(id);
  var checked = regs.filter(function (r) { return r.checked_in; }).length;

  var regList = regs.map(function (r) {
    var p = r.stick_id ? stickOf(r.stick_id) : null;
    var nm = p ? p.name : (r.name || "—");
    var tag = p ? relLabel(p) : "Visitante";
    var contact = [r.email, r.phone].filter(Boolean).join(" · ");
    return '<div class="li"><div class="av' + (r.checked_in ? "" : " c") + '">' + initials(nm || "?") + '</div><div style="flex:1"><div><b>' + esc(nm) + '</b> <span class="chip ' + (p ? "member" : "visitor") + '">' + esc(tag) + '</span></div>' + (contact ? '<div class="meta">' + esc(contact) + '</div>' : '') + '</div><div class="right"><button class="btn ghost sm" data-regcheck="' + r.id + '" data-on="' + (r.checked_in ? "1" : "0") + '">' + (r.checked_in ? "Presente ✓" : "Check-in") + '</button><button class="link" data-regdel="' + r.id + '">remover</button></div></div>';
  }).join("") || '<div class="empty">Ninguém inscrito ainda. Use “Inscrever”.</div>';

  var flags = [];
  if (e.registration_required) flags.push("Inscrição obrigatória");
  if (e.check_in_enabled) flags.push("Check-in ativo");
  if (e.payment_required) flags.push("Pagamento (interno)");
  var info = '<div class="field"><label>Quando</label><div>' + esc(whenLabel(e)) + '</div></div>' +
    (e.location ? '<div class="field"><label>Local</label><div>' + esc(e.location) + '</div></div>' : '') +
    (e.campus ? '<div class="field"><label>Campus</label><div>' + esc(e.campus) + '</div></div>' : '') +
    (e.capacity ? '<div class="field"><label>Capacidade</label><div>' + regs.length + ' / ' + e.capacity + '</div></div>' : '') +
    (flags.length ? '<div class="field"><label>Configuração</label><div>' + flags.join(" · ") + '</div></div>' : '') +
    (e.description ? '<div class="field"><label>Sobre</label><div>' + esc(e.description) + '</div></div>' : '');

  return '<button class="link" id="eventsBack">&#8592; Voltar aos eventos</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(e.name || "(sem nome)") + '</h1><p class="sub" style="margin:0">' + esc(whenLabel(e)) + (e.type ? ' · ' + esc(e.type) : '') + ' · ' + (STATUS_LBL[e.status] || e.status) + '</p></div><button class="btn ghost" id="editEvent" data-event="' + id + '" style="margin-left:auto">Editar</button><button class="btn" id="registerBtn" data-event="' + id + '">Inscrever</button></div>' +
    '<div class="row2"><div class="panel"><div class="ph"><h3>Inscrições</h3><span class="muted" style="margin-left:auto">' + regs.length + ' inscrito' + (regs.length !== 1 ? 's' : '') + (checked ? ' · ' + checked + ' presente' + (checked !== 1 ? 's' : '') : '') + '</span></div>' + regList + '</div>' +
    '<div class="panel"><div class="ph"><h3>Sobre o evento</h3></div>' + info + '</div></div>';
}

function eventModal(e) {
  var isNew = !e; e = e || { status: "active", campus: state.activeCampus, registration_required: true, check_in_enabled: true };
  var campusSel = '<select id="ev-campus">' + state.institution.campuses.map(function (c) { return '<option' + (e.campus === c ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("") + '</select>';
  openModal('<h3>' + (isNew ? 'Novo evento' : 'Editar evento') + '</h3>' +
    '<div class="field"><label>Nome</label><input id="ev-name" value="' + esc(e.name || "") + '" placeholder="Ex.: Conferência de Jovens"></div>' +
    '<div class="mrow"><div class="field"><label>Tipo</label><input id="ev-type" value="' + esc(e.type || "") + '" placeholder="Ex.: Conferência, Retiro, Curso"></div><div class="field"><label>Campus</label>' + campusSel + '</div></div>' +
    '<div class="mrow"><div class="field"><label>Data</label><input id="ev-date" type="date" value="' + esc(e.event_date || "") + '"></div><div class="field"><label>Status</label><select id="ev-status">' + Object.keys(STATUS_LBL).map(function (k) { return '<option value="' + k + '"' + ((e.status || "active") === k ? " selected" : "") + '>' + STATUS_LBL[k] + '</option>'; }).join("") + '</select></div></div>' +
    '<div class="mrow"><div class="field"><label>Início</label><input id="ev-start" type="time" value="' + esc(e.start_time || "") + '"></div><div class="field"><label>Fim</label><input id="ev-end" type="time" value="' + esc(e.end_time || "") + '"></div></div>' +
    '<div class="mrow"><div class="field"><label>Local</label><input id="ev-loc" value="' + esc(e.location || "") + '" placeholder="Opcional"></div><div class="field"><label>Capacidade</label><input id="ev-cap" type="number" min="0" value="' + (e.capacity != null ? e.capacity : "") + '" placeholder="Opcional"></div></div>' +
    '<div class="field"><label>Descrição</label><textarea id="ev-desc" rows="2" placeholder="Opcional">' + esc(e.description || "") + '</textarea></div>' +
    '<div class="field check"><input type="checkbox" id="ev-reg"' + (e.registration_required ? " checked" : "") + '><label>Requer inscrição</label></div>' +
    '<div class="field check"><input type="checkbox" id="ev-chk"' + (e.check_in_enabled ? " checked" : "") + '><label>Check-in ativo</label></div>' +
    '<div class="field check"><input type="checkbox" id="ev-pay"' + (e.payment_required ? " checked" : "") + '><label>Requer pagamento (registro interno; cobrança online é futura)</label></div>' +
    '<div class="actions">' + (isNew ? '' : '<button class="btn ghost" id="ev-del" data-id="' + e.id + '" style="margin-right:auto;color:var(--danger,#c0392b)">Excluir</button>') + '<button class="btn ghost" id="ev-cancel">Cancelar</button><button class="btn" id="ev-save" data-id="' + (e.id || "") + '">' + (isNew ? 'Criar evento' : 'Salvar') + '</button></div>');
  document.getElementById("ev-cancel").onclick = closeModal;
  var del = document.getElementById("ev-del");
  if (del) del.onclick = function () { if (!window.confirm("Excluir este evento e as inscrições dele?")) return; deleteEvent(this.getAttribute("data-id")).then(function () { closeModal(); state.eventDetail = null; render(); }); };
  document.getElementById("ev-save").onclick = function () {
    var name = val("ev-name").trim(); if (!name) { var el = document.getElementById("ev-name"); if (el) el.focus(); return; }
    var data = { name: name, type: val("ev-type").trim(), campus: val("ev-campus"), event_date: val("ev-date"), status: val("ev-status"), start_time: val("ev-start"), end_time: val("ev-end"), location: val("ev-loc").trim(), capacity: val("ev-cap"), description: val("ev-desc").trim(), registration_required: chk("ev-reg"), check_in_enabled: chk("ev-chk"), payment_required: chk("ev-pay") };
    var id = this.getAttribute("data-id");
    if (id) updateEvent(id, data).then(function () { closeModal(); render(); });
    else createEvent(data).then(function (nid) { closeModal(); if (nid) state.eventDetail = nid; save(); render(); });
  };
}

// Inscrever: vincula a um Stick existente OU registra visitante novo (sem criar Stick).
function registerModal(eventId) {
  var already = {}; regsOf(eventId).forEach(function (r) { if (r.stick_id) already[r.stick_id] = 1; });
  var ppl = (state.people || []).filter(function (p) { return !p.archived && !already[p.id]; });
  var stickOpts = '<option value="">— Visitante novo (não vincular) —</option>' + ppl.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' (' + relLabel(p) + ')</option>'; }).join("");
  openModal('<h3>Inscrever no evento</h3>' +
    '<div class="field"><label>Pessoa conhecida (Stick)</label><select id="rg-stick">' + stickOpts + '</select></div>' +
    '<div class="msub" style="margin:2px 0 10px">Se for visitante novo, deixe acima em “Visitante novo” e preencha abaixo — não criamos uma Stick duplicada aqui.</div>' +
    '<div class="field"><label>Nome (visitante)</label><input id="rg-name" placeholder="Nome de quem não é Stick ainda"></div>' +
    '<div class="mrow"><div class="field"><label>E-mail</label><input id="rg-email" placeholder="Opcional"></div><div class="field"><label>Telefone</label><input id="rg-phone" placeholder="Opcional"></div></div>' +
    '<div class="field check"><input type="checkbox" id="rg-checkin"><label>Já marcar presença (check-in)</label></div>' +
    '<div class="actions"><button class="btn ghost" id="rg-cancel">Cancelar</button><button class="btn" id="rg-save" data-event="' + eventId + '">Inscrever</button></div>');
  document.getElementById("rg-cancel").onclick = closeModal;
  document.getElementById("rg-save").onclick = function () {
    var stickId = val("rg-stick");
    var name = val("rg-name").trim();
    if (!stickId && !name) { var el = document.getElementById("rg-name"); if (el) el.focus(); return; }
    var data = { stick_id: stickId || null, name: stickId ? "" : name, email: val("rg-email").trim(), phone: val("rg-phone").trim(), checked_in: chk("rg-checkin") };
    addRegistration(this.getAttribute("data-event"), data).then(function () { closeModal(); render(); });
  };
}

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-eventdetail],[data-regcheck],[data-regdel],#newEvent,#eventsBack,#editEvent,#registerBtn") : null; if (!t) return;
  if (t.getAttribute("data-eventdetail")) { state.eventDetail = t.getAttribute("data-eventdetail"); save(); render(); return; }
  if (t.getAttribute("data-regcheck")) { var on = t.getAttribute("data-on") === "1"; toggleCheckIn(t.getAttribute("data-regcheck"), !on).then(function () { render(); }); return; }
  if (t.getAttribute("data-regdel")) { if (!window.confirm("Remover esta inscrição?")) return; removeRegistration(t.getAttribute("data-regdel")).then(function () { render(); }); return; }
  if (t.id === "newEvent") { eventModal(null); return; }
  if (t.id === "eventsBack") { state.eventDetail = null; save(); render(); return; }
  if (t.id === "editEvent") { eventModal(eventById(t.getAttribute("data-event"))); return; }
  if (t.id === "registerBtn") { registerModal(t.getAttribute("data-event")); return; }
});
