// Serviço — Times & Ministérios (Step 7 · Fase 1). Team = onde a pessoa SERVE
// (≠ Group, onde ela pertence). Ministério agrupa times. Aqui: CRUD de ministérios/
// times e o vínculo de serviço Stick↔Team (team_members). Consciência operacional,
// nunca RH/nota. Vazio honesto. Dashboards de saúde vêm na Fase 2.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc, initials } from "../core/helpers.js";
import { inCampus } from "../core/derived.js";
import { createMinistry, updateMinistry, deleteMinistry } from "../core/ministries-repo.js";
import { createTeam, updateTeam, deleteTeam, addTeamMember, updateTeamMember, removeTeamMember, setTeamLeader } from "../core/teams-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

var TEAM_STATUS_LBL = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };
var TEAM_STATUS_BAND = { active: "healthy", inactive: "attention", archived: "risk" };
var MIN_STATUS_LBL = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };
var MEMBER_STATUS_LBL = { active: "Servindo", paused: "Em pausa", inactive: "Inativo" };
var MEMBER_STATUS_BAND = { active: "healthy", paused: "attention", inactive: "risk" };

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function personName(id) { var p = (state.people || []).find(function (x) { return x.id === id; }); return p ? p.name : ""; }
function teamById(id) { return (state.teams || []).find(function (x) { return x.id === id; }) || null; }
function ministryById(id) { return (state.ministries || []).find(function (x) { return x.id === id; }) || null; }
function membersOf(teamId) { return (state.teamMembers || []).filter(function (x) { return x.team_id === teamId; }); }
function parseRoles(s) { return (s || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean); }
function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (sel === k ? " selected" : "") + '>' + map[k] + '</option>'; }).join(""); }
function campusPeople() { return (state.people || []).filter(inCampus).filter(function (p) { return !p.archived; }); }

export function viewTeams() {
  if (state.teamDetail) return teamDetailView(state.teamDetail);
  var teams = state.teams || [];
  var mins = state.ministries || [];

  function teamCard(t) {
    var n = membersOf(t.id).filter(function (m) { return m.status !== "inactive"; }).length;
    var lead = t.leader_id ? personName(t.leader_id) : "";
    return '<button class="gcard" data-teamdetail="' + t.id + '"><div class="gc-top"><span class="gc-name">' + esc(t.name || "(sem nome)") + '</span><span class="hb ' + (TEAM_STATUS_BAND[t.status] || "attention") + '">' + (TEAM_STATUS_LBL[t.status] || t.status) + '</span></div><div class="gc-sub">' + n + ' servindo' + (lead ? ' · líder: ' + esc(lead) : ' · sem líder') + '</div>' + (t.description ? '<div class="gc-foot">' + esc(t.description) + '</div>' : '') + '</button>';
  }

  var body = "";
  if (!teams.length && !mins.length) {
    body = '<div class="empty">Nenhum time ainda. Crie um ministério (ex.: Louvor) e os times que servem nele, ou um time direto.</div>';
  } else {
    // Ministérios como seções, cada um com seus times; depois os times sem ministério.
    mins.forEach(function (m) {
      var mine = teams.filter(function (t) { return t.ministry_id === m.id; });
      var cards = mine.length ? '<div class="gcards" style="margin-bottom:16px">' + mine.map(teamCard).join("") + '</div>' : '<div class="empty" style="margin-bottom:16px">Sem times neste ministério ainda.</div>';
      body += '<div class="ph" style="margin:4px 0 6px"><h3 style="margin:0">' + esc(m.name) + '</h3><span class="hb ' + (m.status === "active" ? "healthy" : "attention") + '" style="margin-left:8px">' + (MIN_STATUS_LBL[m.status] || m.status) + '</span><button class="link" data-ministryedit="' + m.id + '" style="margin-left:auto">editar</button></div>' + cards;
    });
    var loose = teams.filter(function (t) { return !t.ministry_id; });
    if (loose.length) body += '<div class="ph" style="margin:4px 0 6px"><h3 class="muted" style="margin:0;font-size:13px;font-weight:600">Sem ministério</h3></div><div class="gcards">' + loose.map(teamCard).join("") + '</div>';
  }

  return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px"><div><h1 class="page">Times</h1><p class="sub" style="margin:0">Quem serve e onde. Times são onde a pessoa serve; ministérios agrupam times. Consciência operacional, não nota.</p></div><button class="btn ghost" id="newMinistry" style="margin-left:auto">+ Ministério</button><button class="btn" id="newTeam">+ Novo time</button></div>' + body;
}

function teamDetailView(id) {
  var t = teamById(id);
  if (!t) return '<button class="link" id="teamsBack">&#8592; Voltar aos times</button><div class="empty">Time não encontrado.</div>';
  var min = t.ministry_id ? ministryById(t.ministry_id) : null;
  var mem = membersOf(id).slice().sort(function (a, b) { return (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1); });
  var leadName = t.leader_id ? personName(t.leader_id) : "";

  var memList = mem.map(function (m) {
    var nm = personName(m.stick_id) || "—";
    var isLead = t.leader_id === m.stick_id;
    var right = '<button class="btn ghost sm" data-memrole="' + m.id + '">Papel</button>' + (isLead ? '' : '<button class="btn ghost sm" data-makelead="' + m.stick_id + '" data-team="' + id + '">Tornar líder</button>') + '<button class="link" data-memremove="' + m.id + '">remover</button>';
    return '<div class="li"><div class="av' + (m.status === "active" ? "" : " c") + '">' + initials(nm) + '</div><div style="flex:1"><div><b>' + esc(nm) + '</b>' + (isLead ? ' <span class="chip member">líder</span>' : '') + '</div><div class="meta">' + (m.role ? esc(m.role) + ' · ' : '') + (MEMBER_STATUS_LBL[m.status] || m.status) + (m.availability ? ' · ' + esc(m.availability) : '') + '</div></div><div class="right">' + right + '</div></div>';
  }).join("") || '<div class="empty">Ninguém serve neste time ainda. Ligue uma pessoa abaixo.</div>';

  // Adicionar quem serve: pessoas do campus que ainda não estão no time.
  var already = {}; mem.forEach(function (m) { already[m.stick_id] = 1; });
  var avail = campusPeople().filter(function (p) { return !already[p.id]; });
  var roleList = (t.serving_roles || []);
  var roleInput = roleList.length
    ? '<select id="tm-role"><option value="">Papel (opcional)</option>' + roleList.map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join("") + '</select>'
    : '<input id="tm-role" placeholder="Papel (opcional)">';
  var addCtl = avail.length
    ? '<div class="mrow" style="margin-top:12px"><div class="field"><label>Ligar pessoa ao time</label><select id="tm-stick">' + avail.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join("") + '</select></div><div class="field">' + '<label>Papel</label>' + roleInput + '</div><div class="field" style="display:flex;align-items:flex-end"><button class="btn ghost" id="tm-add" data-team="' + id + '">Adicionar</button></div></div>'
    : '<div class="muted" style="margin-top:12px">Todo o campus já está neste time.</div>';

  var rolesHtml = roleList.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + roleList.map(function (r) { return '<span class="chip" style="background:rgba(43,92,230,.10);color:var(--blue)">' + esc(r) + '</span>'; }).join("") + '</div>' : '<div class="muted">Sem papéis definidos. Defina em “Editar time” (ex.: Vocal, Guitarra, Mesa).</div>';

  return '<button class="link" id="teamsBack">&#8592; Voltar aos times</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(t.name || "(sem nome)") + '</h1><p class="sub" style="margin:0">' + (min ? esc(min.name) + ' · ' : '') + (t.campus ? esc(t.campus) + ' · ' : '') + (TEAM_STATUS_LBL[t.status] || t.status) + '</p></div><button class="btn ghost" id="editTeam" data-team="' + id + '" style="margin-left:auto">Editar time</button></div>' +
    '<div class="row2"><div class="panel"><div class="ph"><h3>Quem serve</h3><span class="muted" style="margin-left:auto">' + mem.filter(function (m) { return m.status !== "inactive"; }).length + '</span></div>' + memList + addCtl + '</div>' +
    '<div class="panel"><div class="ph"><h3>Papéis de serviço</h3></div>' + rolesHtml + (t.description ? '<div class="field" style="margin-top:14px"><label>Sobre</label><div>' + esc(t.description) + '</div></div>' : '') + '<div class="field" style="margin-top:14px"><label>Líder</label><div>' + (leadName ? esc(leadName) : '<span class="muted">Sem líder</span>') + '</div></div></div></div>';
}

function ministryModal(m) {
  var isNew = !m; m = m || { status: "active" };
  var leaderOpts = '<option value="">Sem líder</option>' + campusPeople().map(function (p) { return '<option value="' + p.id + '"' + (m.leader_id === p.id ? " selected" : "") + '>' + esc(p.name) + '</option>'; }).join("");
  openModal('<h3>' + (isNew ? 'Novo ministério' : 'Editar ministério') + '</h3>' +
    '<div class="field"><label>Nome</label><input id="mn-name" value="' + esc(m.name || "") + '" placeholder="Ex.: Louvor"></div>' +
    '<div class="field"><label>Descrição</label><textarea id="mn-desc" rows="2" placeholder="O que este ministério cuida">' + esc(m.description || "") + '</textarea></div>' +
    '<div class="mrow"><div class="field"><label>Líder</label><select id="mn-leader">' + leaderOpts + '</select></div><div class="field"><label>Status</label><select id="mn-status">' + opts(MIN_STATUS_LBL, m.status || "active") + '</select></div></div>' +
    '<div class="actions">' + (isNew ? '' : '<button class="btn ghost" id="mn-del" data-id="' + m.id + '" style="margin-right:auto;color:var(--danger,#c0392b)">Excluir</button>') + '<button class="btn ghost" id="mn-cancel">Cancelar</button><button class="btn" id="mn-save" data-id="' + (m.id || "") + '">' + (isNew ? 'Criar' : 'Salvar') + '</button></div>');
  document.getElementById("mn-cancel").onclick = closeModal;
  var del = document.getElementById("mn-del");
  if (del) del.onclick = function () { if (!window.confirm("Excluir este ministério? Os times ficam sem ministério.")) return; deleteMinistry(this.getAttribute("data-id")).then(function () { closeModal(); render(); }); };
  document.getElementById("mn-save").onclick = function () {
    var name = val("mn-name").trim(); if (!name) { var el = document.getElementById("mn-name"); if (el) el.focus(); return; }
    var data = { name: name, description: val("mn-desc").trim(), leader_id: val("mn-leader") || null, status: val("mn-status"), campus: state.activeCampus };
    var id = this.getAttribute("data-id");
    if (id) updateMinistry(id, data).then(function () { closeModal(); render(); });
    else createMinistry(data).then(function () { closeModal(); render(); });
  };
}

function teamModal(t) {
  var isNew = !t; t = t || { status: "active", serving_roles: [] };
  var minOpts = '<option value="">Sem ministério</option>' + (state.ministries || []).map(function (m) { return '<option value="' + m.id + '"' + (t.ministry_id === m.id ? " selected" : "") + '>' + esc(m.name) + '</option>'; }).join("");
  var leaderOpts = '<option value="">Sem líder</option>' + campusPeople().map(function (p) { return '<option value="' + p.id + '"' + (t.leader_id === p.id ? " selected" : "") + '>' + esc(p.name) + '</option>'; }).join("");
  openModal('<h3>' + (isNew ? 'Novo time' : 'Editar time') + '</h3>' +
    '<div class="field"><label>Nome</label><input id="tk-name" value="' + esc(t.name || "") + '" placeholder="Ex.: Banda"></div>' +
    '<div class="mrow"><div class="field"><label>Ministério</label><select id="tk-min">' + minOpts + '</select></div><div class="field"><label>Status</label><select id="tk-status">' + opts(TEAM_STATUS_LBL, t.status || "active") + '</select></div></div>' +
    '<div class="field"><label>Descrição</label><textarea id="tk-desc" rows="2" placeholder="O que este time faz">' + esc(t.description || "") + '</textarea></div>' +
    '<div class="field"><label>Papéis de serviço (vírgula)</label><input id="tk-roles" value="' + esc((t.serving_roles || []).join(", ")) + '" placeholder="Vocal, Guitarra, Mesa de som"></div>' +
    '<div class="field"><label>Líder</label><select id="tk-leader">' + leaderOpts + '</select></div>' +
    '<div class="actions">' + (isNew ? '' : '<button class="btn ghost" id="tk-del" data-id="' + t.id + '" style="margin-right:auto;color:var(--danger,#c0392b)">Excluir</button>') + '<button class="btn ghost" id="tk-cancel">Cancelar</button><button class="btn" id="tk-save" data-id="' + (t.id || "") + '">' + (isNew ? 'Criar' : 'Salvar') + '</button></div>');
  document.getElementById("tk-cancel").onclick = closeModal;
  var del = document.getElementById("tk-del");
  if (del) del.onclick = function () { if (!window.confirm("Excluir este time e os vínculos de serviço dele?")) return; deleteTeam(this.getAttribute("data-id")).then(function () { closeModal(); state.teamDetail = null; render(); }); };
  document.getElementById("tk-save").onclick = function () {
    var name = val("tk-name").trim(); if (!name) { var el = document.getElementById("tk-name"); if (el) el.focus(); return; }
    var data = { name: name, ministry_id: val("tk-min") || null, status: val("tk-status"), description: val("tk-desc").trim(), serving_roles: parseRoles(val("tk-roles")), leader_id: val("tk-leader") || null, campus: state.activeCampus };
    var id = this.getAttribute("data-id");
    if (id) updateTeam(id, data).then(function () { closeModal(); render(); });
    else createTeam(data).then(function (nid) { closeModal(); if (nid) state.teamDetail = nid; save(); render(); });
  };
}

function memberRoleModal(memberId) {
  var m = (state.teamMembers || []).find(function (x) { return x.id === memberId; }); if (!m) return;
  var team = teamById(m.team_id) || {};
  var roleList = team.serving_roles || [];
  var roleInput = roleList.length
    ? '<select id="mr-role"><option value="">Nenhum</option>' + roleList.map(function (r) { return '<option value="' + esc(r) + '"' + (m.role === r ? " selected" : "") + '>' + esc(r) + '</option>'; }).join("") + (roleList.indexOf(m.role) < 0 && m.role ? '<option value="' + esc(m.role) + '" selected>' + esc(m.role) + '</option>' : '') + '</select>'
    : '<input id="mr-role" value="' + esc(m.role || "") + '" placeholder="Ex.: Vocal">';
  openModal('<h3>' + esc(personName(m.stick_id)) + ' — serviço</h3>' +
    '<div class="field"><label>Papel</label>' + roleInput + '</div>' +
    '<div class="mrow"><div class="field"><label>Status</label><select id="mr-status">' + opts(MEMBER_STATUS_LBL, m.status) + '</select></div><div class="field"><label>Disponibilidade</label><input id="mr-avail" value="' + esc(m.availability || "") + '" placeholder="Ex.: manhãs, quinzenal"></div></div>' +
    '<div class="actions"><button class="btn ghost" id="mr-cancel">Cancelar</button><button class="btn" id="mr-save" data-id="' + m.id + '">Salvar</button></div>');
  document.getElementById("mr-cancel").onclick = closeModal;
  document.getElementById("mr-save").onclick = function () {
    updateTeamMember(this.getAttribute("data-id"), { role: val("mr-role"), status: val("mr-status"), availability: val("mr-avail").trim() }).then(function () { closeModal(); render(); });
  };
}

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-teamdetail],[data-ministryedit],[data-memrole],[data-makelead],[data-memremove],#newMinistry,#newTeam,#teamsBack,#editTeam,#tm-add") : null; if (!t) return;
  if (t.getAttribute("data-teamdetail")) { state.teamDetail = t.getAttribute("data-teamdetail"); save(); render(); return; }
  if (t.getAttribute("data-ministryedit")) { ministryModal(ministryById(t.getAttribute("data-ministryedit"))); return; }
  if (t.getAttribute("data-memrole")) { memberRoleModal(t.getAttribute("data-memrole")); return; }
  if (t.getAttribute("data-makelead")) { setTeamLeader(t.getAttribute("data-team"), t.getAttribute("data-makelead")).then(function () { render(); }); return; }
  if (t.getAttribute("data-memremove")) { if (!window.confirm("Remover esta pessoa do time?")) return; removeTeamMember(t.getAttribute("data-memremove")).then(function () { render(); }); return; }
  if (t.id === "newMinistry") { ministryModal(null); return; }
  if (t.id === "newTeam") { teamModal(null); return; }
  if (t.id === "editTeam") { teamModal(teamById(t.getAttribute("data-team"))); return; }
  if (t.id === "teamsBack") { state.teamDetail = null; save(); render(); return; }
  if (t.id === "tm-add") {
    var sel = document.getElementById("tm-stick"); if (!sel || !sel.value) return;
    addTeamMember(t.getAttribute("data-team"), sel.value, { role: val("tm-role") }).then(function () { render(); });
    return;
  }
});
