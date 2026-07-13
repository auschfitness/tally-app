// Serviço — Times & Ministérios (Step 7 · Fase 1). Team = onde a pessoa SERVE
// (≠ Group, onde ela pertence). Ministério agrupa times. Aqui: CRUD de ministérios/
// times e o vínculo de serviço Stick↔Team (team_members). Consciência operacional,
// nunca RH/nota. Vazio honesto. Dashboards de saúde vêm na Fase 2.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc, initials, iso, today } from "../core/helpers.js";
import { inCampus } from "../core/derived.js";
import { createMinistry, updateMinistry, deleteMinistry } from "../core/ministries-repo.js";
import { createTeam, updateTeam, deleteTeam, addTeamMember, updateTeamMember, removeTeamMember, setTeamLeader } from "../core/teams-repo.js";
import { createAssignment, setAssignmentStatus, deleteAssignment } from "../core/schedule-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

var TEAM_STATUS_LBL = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };
var TEAM_STATUS_BAND = { active: "healthy", inactive: "attention", archived: "risk" };
var MIN_STATUS_LBL = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };
var MEMBER_STATUS_LBL = { active: "Servindo", paused: "Em pausa", inactive: "Inativo" };
var MEMBER_STATUS_BAND = { active: "healthy", paused: "attention", inactive: "risk" };
// Desenvolvimento de liderança (Fase 6, §18): caminho leve, sem score.
var DEV_LBL = { serving: "Servindo", apprentice: "Aprendiz", co_leader: "Co-líder", leader: "Líder" };
var DEV_SETTABLE = { serving: "Servindo", apprentice: "Aprendiz", co_leader: "Co-líder" };
// Estágio de um membro: Líder vem de teams.leader_id; os demais do app_state (leadershipDev).
function devStage(m, team) { if (team && team.leader_id === m.stick_id) return "leader"; return (state.leadershipDev || {})[m.id] || "serving"; }
function setMemberDev(memberId, stage) { if (!state.leadershipDev) state.leadershipDev = {}; if (stage === "serving") delete state.leadershipDev[memberId]; else state.leadershipDev[memberId] = stage; save(); }

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function personName(id) { var p = (state.people || []).find(function (x) { return x.id === id; }); return p ? p.name : ""; }
function teamById(id) { return (state.teams || []).find(function (x) { return x.id === id; }) || null; }
function ministryById(id) { return (state.ministries || []).find(function (x) { return x.id === id; }) || null; }
function membersOf(teamId) { return (state.teamMembers || []).filter(function (x) { return x.team_id === teamId; }); }
function parseRoles(s) { return (s || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean); }
function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (sel === k ? " selected" : "") + '>' + map[k] + '</option>'; }).join(""); }
function campusPeople() { return (state.people || []).filter(inCampus).filter(function (p) { return !p.archived; }); }

// Barra proporcional simples (maior contagem = 100%). Só dado real.
function bar(n, max, band) { var pct = max ? Math.round(n / max * 100) : 0; return '<div class="gbar" style="margin-top:4px"><i class="' + (band || "healthy") + '" style="width:' + pct + '%"></i></div>'; }
function activeMembersOf(teamId) { return membersOf(teamId).filter(function (m) { return m.status === "active"; }); }

// Team Health (Fase 4, §7-8): OBSERVAÇÕES operacionais, nunca um score. Tamanho,
// líder, papéis descobertos e concentração da escala ("depende de poucos"). Só dado real.
function teamHealth(teamId) {
  var t = teamById(teamId); if (!t) return { obs: [] };
  var active = activeMembersOf(teamId);
  var obs = [];
  if (active.length === 0) obs.push({ band: "risk", text: "Ninguém serve neste time ainda." });
  else if (active.length < 3) obs.push({ band: "attention", text: "Time pequeno: " + active.length + " pessoa" + (active.length > 1 ? "s" : "") + " servindo." });
  else obs.push({ band: "healthy", text: active.length + " pessoas servindo." });
  if (!t.leader_id) obs.push({ band: "attention", text: "Sem líder definido." });
  var paused = membersOf(teamId).filter(function (m) { return m.status === "paused"; }).length;
  if (paused) obs.push({ band: "attention", text: paused + " pessoa" + (paused > 1 ? "s" : "") + " em pausa." });
  var covered = {}; active.forEach(function (m) { if (m.role) covered[m.role] = 1; });
  var uncov = (t.serving_roles || []).filter(function (r) { return !covered[r]; });
  if (uncov.length) obs.push({ band: "attention", text: "Papel sem ninguém: " + uncov.join(", ") + "." });
  // Concentração de escala nas últimas 8 semanas (poucos cobrindo muito?).
  var from = iso(addDays(today(), -56)), to = iso(today());
  var asg = (state.schedule || []).filter(function (a) { return a.team_id === teamId && a.stick_id && a.assignment_date >= from && a.assignment_date <= to; });
  if (asg.length) {
    var byStick = {}; asg.forEach(function (a) { byStick[a.stick_id] = (byStick[a.stick_id] || 0) + 1; });
    var counts = Object.keys(byStick).map(function (k) { return byStick[k]; }).sort(function (a, b) { return b - a; });
    var total = asg.length, people = counts.length, acc = 0, need = 0;
    for (var i = 0; i < counts.length; i++) { acc += counts[i]; need++; if (acc / total >= 0.7) break; }
    var pct = Math.round(acc / total * 100);
    if (people > 1 && need <= Math.ceil(people / 2)) obs.push({ band: "risk", text: need + " pessoa" + (need > 1 ? "s" : "") + " cobriram " + pct + "% das escalações das últimas 8 semanas — depende de poucos." });
    else obs.push({ band: "healthy", text: people + " pessoa" + (people > 1 ? "s" : "") + " dividiram " + total + " escalação" + (total > 1 ? "ões" : "") + " nas últimas 8 semanas." });
  } else {
    obs.push({ band: "muted", text: "Ainda sem escalações recentes para avaliar distribuição." });
  }
  return { obs: obs };
}
function healthDot(band) { var c = band === "risk" ? "#EA5B4C" : band === "attention" ? "#E8833A" : band === "healthy" ? "#1FA97A" : "var(--text-2)"; return '<span style="width:8px;height:8px;border-radius:50%;background:' + c + ';display:inline-block;margin-right:9px;flex:none"></span>'; }

export function viewTeams() {
  if (state.scheduleView) return scheduleBoard();
  if (state.teamDetail) return teamDetailView(state.teamDetail);
  if (state.ministryDetail) return ministryDashboard(state.ministryDetail);
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
      body += '<div class="ph" style="margin:4px 0 6px"><h3 style="margin:0;cursor:pointer" data-ministrydetail="' + m.id + '">' + esc(m.name) + '</h3><span class="hb ' + (m.status === "active" ? "healthy" : "attention") + '" style="margin-left:8px">' + (MIN_STATUS_LBL[m.status] || m.status) + '</span><button class="link" data-ministrydetail="' + m.id + '" style="margin-left:auto">painel</button><button class="link" data-ministryedit="' + m.id + '">editar</button></div>' + cards;
    });
    var loose = teams.filter(function (t) { return !t.ministry_id; });
    if (loose.length) body += '<div class="ph" style="margin:4px 0 6px"><h3 class="muted" style="margin:0;font-size:13px;font-weight:600">Sem ministério</h3></div><div class="gcards">' + loose.map(teamCard).join("") + '</div>';
  }

  return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px"><div><h1 class="page">Times</h1><p class="sub" style="margin:0">Quem serve e onde. Times são onde a pessoa serve; ministérios agrupam times. Consciência operacional, não nota.</p></div><button class="btn ghost" id="openSchedule" style="margin-left:auto">Escala</button><button class="btn ghost" id="newMinistry">+ Ministério</button><button class="btn" id="newTeam">+ Novo time</button></div>' + body;
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
    var dev = devStage(m, t);
    var devBadge = isLead ? ' <span class="chip member">líder</span>' : (dev !== "serving" ? ' <span class="chip leader">' + DEV_LBL[dev] + '</span>' : '');
    var right = '<button class="btn ghost sm" data-memrole="' + m.id + '">Papel</button>' + (isLead ? '' : '<button class="btn ghost sm" data-makelead="' + m.stick_id + '" data-team="' + id + '">Tornar líder</button>') + '<button class="link" data-memremove="' + m.id + '">remover</button>';
    return '<div class="li"><div class="av' + (m.status === "active" ? "" : " c") + '">' + initials(nm) + '</div><div style="flex:1"><div><b>' + esc(nm) + '</b>' + devBadge + '</div><div class="meta">' + (m.role ? esc(m.role) + ' · ' : '') + (MEMBER_STATUS_LBL[m.status] || m.status) + (m.availability ? ' · ' + esc(m.availability) : '') + '</div></div><div class="right">' + right + '</div></div>';
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

  // Distribuição de serviço (Fase 2): por papel e por status. Só dado real; ajuda a
  // enxergar concentração ("poucos cobrindo muito") sem julgar ninguém.
  var active = mem.filter(function (m) { return m.status === "active"; });
  var byRole = {}; active.forEach(function (m) { var r = m.role || "Sem papel"; byRole[r] = (byRole[r] || 0) + 1; });
  (t.serving_roles || []).forEach(function (r) { if (byRole[r] === undefined) byRole[r] = 0; });
  var roleKeys = Object.keys(byRole);
  var maxRole = roleKeys.reduce(function (a, k) { return Math.max(a, byRole[k]); }, 0);
  var roleDist = roleKeys.length ? roleKeys.map(function (k) {
    return '<div class="li" style="display:block;padding:6px 0"><div><b>' + esc(k) + '</b> <span class="muted">· ' + byRole[k] + (byRole[k] === 0 ? ' (ninguém ainda)' : '') + '</span></div>' + bar(byRole[k], maxRole, byRole[k] === 0 ? "attention" : "healthy") + '</div>';
  }).join("") : '<div class="empty">Sem papéis para distribuir ainda.</div>';
  var nActive = active.length, nPaused = mem.filter(function (m) { return m.status === "paused"; }).length, nInact = mem.filter(function (m) { return m.status === "inactive"; }).length;
  var statusRow = '<div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:4px"><span><b style="color:var(--green)">' + nActive + '</b> <span class="muted">servindo</span></span><span><b style="color:#E8833A">' + nPaused + '</b> <span class="muted">em pausa</span></span><span><b class="muted">' + nInact + '</b> <span class="muted">inativos</span></span></div>';

  return '<button class="link" id="teamsBack">&#8592; Voltar aos times</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(t.name || "(sem nome)") + '</h1><p class="sub" style="margin:0">' + (min ? '<span data-ministrydetail="' + min.id + '" style="cursor:pointer;text-decoration:underline">' + esc(min.name) + '</span> · ' : '') + (t.campus ? esc(t.campus) + ' · ' : '') + (TEAM_STATUS_LBL[t.status] || t.status) + '</p></div><button class="btn ghost" id="editTeam" data-team="' + id + '" style="margin-left:auto">Editar time</button></div>' +
    '<div class="row2"><div class="panel"><div class="ph"><h3>Quem serve</h3><span class="muted" style="margin-left:auto">' + mem.filter(function (m) { return m.status !== "inactive"; }).length + '</span></div>' + memList + addCtl + '</div>' +
    '<div class="panel"><div class="ph"><h3>Papéis de serviço</h3></div>' + rolesHtml + (t.description ? '<div class="field" style="margin-top:14px"><label>Sobre</label><div>' + esc(t.description) + '</div></div>' : '') + '<div class="field" style="margin-top:14px"><label>Líder</label><div>' + (leadName ? esc(leadName) : '<span class="muted">Sem líder</span>') + '</div></div></div></div>' +
    '<div class="panel" style="margin-top:16px"><div class="ph"><h3>Distribuição de serviço</h3></div>' + statusRow + '<div style="margin-top:12px">' + roleDist + '</div></div>' +
    '<div class="panel" style="margin-top:16px"><div class="ph"><h3>Saúde do time</h3><span class="muted" style="margin-left:auto">consciência operacional, não nota</span></div>' +
    teamHealth(id).obs.map(function (o) { return '<div class="li" style="align-items:center">' + healthDot(o.band) + '<div style="flex:1">' + esc(o.text) + '</div></div>'; }).join("") +
    '</div>' + leadershipPanel(id, mem, t);
}

// Painel de Desenvolvimento de liderança (Fase 6, §18): a escada Servindo → Aprendiz →
// Co-líder → Líder, com nomes por estágio. É um caminho de crescimento, não uma nota.
function leadershipPanel(id, mem, t) {
  var stages = ["serving", "apprentice", "co_leader", "leader"];
  var byStage = { serving: [], apprentice: [], co_leader: [], leader: [] };
  mem.filter(function (m) { return m.status !== "inactive"; }).forEach(function (m) { byStage[devStage(m, t)].push(personName(m.stick_id) || "—"); });
  var cols = stages.map(function (s) {
    var names = byStage[s];
    var list = names.length ? names.map(function (n) { return '<div class="li" style="padding:4px 0"><div class="av" style="width:26px;height:26px;font-size:10px">' + initials(n) + '</div><div style="flex:1"><b>' + esc(n) + '</b></div></div>'; }).join("") : '<div class="muted" style="font-size:13px">—</div>';
    return '<div class="panel" style="margin:0"><div class="ph" style="margin-bottom:6px"><h3 style="font-size:13px">' + DEV_LBL[s] + '</h3><span class="muted" style="margin-left:auto">' + names.length + '</span></div>' + list + '</div>';
  }).join("");
  return '<div style="margin-top:16px"><div class="ph" style="margin-bottom:8px"><h3 style="margin:0">Desenvolvimento de liderança</h3><span class="muted" style="margin-left:auto">um caminho de crescimento, não uma nota</span></div><div class="row2" style="grid-template-columns:repeat(4,1fr)">' + cols + '</div></div>';
}

// Dashboard do ministério (Fase 2, §16-17): consciência operacional do ministério —
// times, pessoas servindo (únicas), times sem líder, distribuição por time. Sem score.
function ministryDashboard(id) {
  var m = ministryById(id);
  if (!m) return '<button class="link" id="teamsBack">&#8592; Voltar aos times</button><div class="empty">Ministério não encontrado.</div>';
  var teams = (state.teams || []).filter(function (t) { return t.ministry_id === id; });
  // pessoas únicas servindo no ministério (status active), sem dupla contagem.
  var uniq = {}; teams.forEach(function (t) { activeMembersOf(t.id).forEach(function (mm) { uniq[mm.stick_id] = 1; }); });
  var peopleServing = Object.keys(uniq).length;
  var noLeader = teams.filter(function (t) { return !t.leader_id; }).length;
  var counts = teams.map(function (t) { return { t: t, n: activeMembersOf(t.id).length }; });
  var max = counts.reduce(function (a, b) { return Math.max(a, b.n); }, 0);

  var dist = counts.length ? counts.map(function (c) {
    return '<button class="li" data-teamdetail="' + c.t.id + '" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:8px 0"><div style="flex:1"><div><b>' + esc(c.t.name) + '</b> <span class="muted">· ' + c.n + ' servindo</span>' + (c.t.leader_id ? '' : ' <span class="hb attention">sem líder</span>') + '</div>' + bar(c.n, max, "healthy") + '</div></button>';
  }).join("") : '<div class="empty">Sem times neste ministério ainda. Crie um em “+ Novo time”.</div>';

  var stat = '<div class="panel" style="margin-bottom:16px;display:flex;gap:28px;flex-wrap:wrap;align-items:center"><div class="mi-k">' + esc(m.name) + '</div>' +
    '<div><b style="color:var(--blue);font-size:16px">' + teams.length + '</b> <span class="muted">time' + (teams.length !== 1 ? 's' : '') + '</span></div>' +
    '<div><b style="color:var(--green);font-size:16px">' + peopleServing + '</b> <span class="muted">servindo</span></div>' +
    '<div><b style="color:#E8833A;font-size:16px">' + noLeader + '</b> <span class="muted">sem líder</span></div>' +
    (m.leader_id ? '<div><span class="muted">Líder do ministério:</span> <b>' + esc(personName(m.leader_id)) + '</b></div>' : '') + '</div>';

  return '<button class="link" id="teamsBack">&#8592; Voltar aos times</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(m.name) + '</h1><p class="sub" style="margin:0">' + (m.description ? esc(m.description) : 'Ministério') + '</p></div><button class="btn ghost" data-ministryedit="' + id + '" style="margin-left:auto">Editar ministério</button></div>' +
    stat +
    '<div class="panel"><div class="ph"><h3>Distribuição de serviço</h3><span class="muted" style="margin-left:auto">por time</span></div>' + dist + '</div>';
}

// ——— Escala de serviço (Fase 3, §11-13): board semanal com avatares (evita cara de
// planilha). Serviço/Evento → Time → Papel → Stick numa data, com status. Como
// serviços/eventos são Step 6, a escala é por data (gancho service_id/event_id pronto).
var ASG_STATUS_LBL = { assigned: "Escalado", confirmed: "Confirmado", declined: "Recusou", replacement_needed: "Precisa cobertura", completed: "Concluído" };
var ASG_STATUS_BAND = { assigned: "attention", confirmed: "healthy", declined: "risk", replacement_needed: "risk", completed: "healthy" };
var ASG_CYCLE = ["assigned", "confirmed", "declined", "replacement_needed", "completed"];
var WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function parseIso(s) { var p = (s || "").split("-"); return new Date(+p[0], (+p[1]) - 1, +p[2]); }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function weekStart(anchorIso) { var d = anchorIso ? parseIso(anchorIso) : today(); var x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }
function ddmm(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); }

function scheduleBoard() {
  var ws = weekStart(state.scheduleAnchor);
  var todayIso = iso(today());
  var sched = state.schedule || [];
  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = addDays(ws, i); var di = iso(d);
    var items = sched.filter(function (a) { return a.assignment_date === di; });
    // agrupa por time
    var byTeam = {}; items.forEach(function (a) { (byTeam[a.team_id] || (byTeam[a.team_id] = [])).push(a); });
    var inner = Object.keys(byTeam).map(function (tid) {
      var team = teamById(tid);
      var chips = byTeam[tid].map(function (a) {
        var nm = personName(a.stick_id) || "—";
        return '<div class="li" style="padding:5px 0"><div class="av" style="width:28px;height:28px;font-size:11px">' + initials(nm) + '</div><div style="flex:1"><div><b>' + esc(nm) + '</b>' + (a.role ? ' <span class="muted">· ' + esc(a.role) + '</span>' : '') + '</div></div><div class="right"><button class="hb ' + (ASG_STATUS_BAND[a.status] || "attention") + '" data-asgstatus="' + a.id + '" title="Clique para avançar o status" style="cursor:pointer;border:0">' + (ASG_STATUS_LBL[a.status] || a.status) + '</button><button class="link" data-asgremove="' + a.id + '">×</button></div></div>';
      }).join("");
      return '<div style="margin-top:6px"><div class="mi-k" style="font-size:11px">' + esc(team ? team.name : "Time removido") + '</div>' + chips + '</div>';
    }).join("") || '<div class="muted" style="padding:4px 0">—</div>';
    days.push('<div class="panel" style="margin-bottom:10px' + (di === todayIso ? ';outline:2px solid var(--blue)' : '') + '"><div class="ph" style="margin-bottom:4px"><h3 style="font-size:14px">' + WD[d.getDay()] + ' ' + ddmm(d) + '</h3><button class="link" data-schedadd="' + di + '" style="margin-left:auto">+ Escalar</button></div>' + inner + '</div>');
  }
  var wkLabel = ddmm(ws) + " – " + ddmm(addDays(ws, 6));
  return '<button class="link" id="teamsBack">&#8592; Voltar aos times</button>' +
    '<div style="display:flex;align-items:center;gap:10px;margin:10px 0 16px"><div><h1 class="page">Escala</h1><p class="sub" style="margin:0">Quem serve em cada data. Confirme, recuse ou peça cobertura. Serviços e eventos chegam no próximo passo.</p></div>' +
    '<div style="margin-left:auto;display:flex;align-items:center;gap:8px"><button class="btn ghost sm" id="schedPrev">‹</button><b>' + wkLabel + '</b><button class="btn ghost sm" id="schedNext">›</button><button class="btn ghost sm" id="schedToday">Hoje</button></div>' +
    '<button class="btn" id="schedAdd">+ Escalar</button></div>' +
    days.join("");
}

function assignModal(dateIso) {
  var teams = (state.teams || []).filter(function (t) { return t.status !== "archived"; });
  if (!teams.length) { openModal('<h3>Escalar</h3><div class="empty">Crie um time primeiro para montar a escala.</div><div class="actions"><button class="btn" id="as-cancel">Fechar</button></div>'); document.getElementById("as-cancel").onclick = closeModal; return; }
  var teamOpts = teams.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join("");
  var ppl = campusPeople();
  var stickOpts = ppl.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join("");
  openModal('<h3>Escalar serviço</h3>' +
    '<div class="mrow"><div class="field"><label>Data</label><input id="as-date" type="date" value="' + esc(dateIso || iso(today())) + '"></div><div class="field"><label>Time</label><select id="as-team">' + teamOpts + '</select></div></div>' +
    '<div class="mrow"><div class="field"><label>Pessoa</label><select id="as-stick">' + stickOpts + '</select></div><div class="field"><label>Papel</label><input id="as-role" placeholder="Ex.: Vocal" list="as-roles"><datalist id="as-roles"></datalist></div></div>' +
    '<div class="actions"><button class="btn ghost" id="as-cancel">Cancelar</button><button class="btn" id="as-save">Escalar</button></div>');
  document.getElementById("as-cancel").onclick = closeModal;
  // papéis sugeridos conforme o time escolhido
  function fillRoles() {
    var t = teamById(val("as-team")); var dl = document.getElementById("as-roles");
    if (dl) dl.innerHTML = ((t && t.serving_roles) || []).map(function (r) { return '<option value="' + esc(r) + '">'; }).join("");
  }
  fillRoles();
  var teamSel = document.getElementById("as-team"); if (teamSel) teamSel.onchange = fillRoles;
  document.getElementById("as-save").onclick = function () {
    var data = { team_id: val("as-team"), stick_id: val("as-stick"), role: val("as-role").trim(), assignment_date: val("as-date"), status: "assigned" };
    if (!data.team_id || !data.stick_id || !data.assignment_date) return;
    createAssignment(data).then(function () { closeModal(); render(); });
  };
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
  var curDev = devStage(m, team);
  var devDisabled = curDev === "leader";
  var devField = devDisabled
    ? '<div class="field"><label>Estágio de liderança</label><div><span class="chip member">Líder</span> <span class="muted">(defina outro líder para mudar)</span></div></div>'
    : '<div class="field"><label>Estágio de liderança</label><select id="mr-dev">' + opts(DEV_SETTABLE, curDev) + '</select></div>';
  openModal('<h3>' + esc(personName(m.stick_id)) + ' — serviço</h3>' +
    '<div class="field"><label>Papel</label>' + roleInput + '</div>' +
    '<div class="mrow"><div class="field"><label>Status</label><select id="mr-status">' + opts(MEMBER_STATUS_LBL, m.status) + '</select></div><div class="field"><label>Disponibilidade</label><input id="mr-avail" value="' + esc(m.availability || "") + '" placeholder="Ex.: manhãs, quinzenal"></div></div>' +
    devField +
    '<div class="actions"><button class="btn ghost" id="mr-cancel">Cancelar</button><button class="btn" id="mr-save" data-id="' + m.id + '">Salvar</button></div>');
  document.getElementById("mr-cancel").onclick = closeModal;
  document.getElementById("mr-save").onclick = function () {
    var mid = this.getAttribute("data-id");
    if (!devDisabled) setMemberDev(mid, val("mr-dev") || "serving");
    updateTeamMember(mid, { role: val("mr-role"), status: val("mr-status"), availability: val("mr-avail").trim() }).then(function () { closeModal(); render(); });
  };
}

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-teamdetail],[data-ministrydetail],[data-ministryedit],[data-memrole],[data-makelead],[data-memremove],[data-asgstatus],[data-asgremove],[data-schedadd],#newMinistry,#newTeam,#teamsBack,#editTeam,#tm-add,#openSchedule,#schedAdd,#schedPrev,#schedNext,#schedToday") : null; if (!t) return;
  if (t.id === "openSchedule") { state.scheduleView = true; state.teamDetail = null; state.ministryDetail = null; state.scheduleAnchor = state.scheduleAnchor || iso(today()); save(); render(); return; }
  if (t.id === "schedAdd") { assignModal(null); return; }
  if (t.getAttribute("data-schedadd")) { assignModal(t.getAttribute("data-schedadd")); return; }
  if (t.id === "schedPrev") { state.scheduleAnchor = iso(addDays(weekStart(state.scheduleAnchor), -7)); save(); render(); return; }
  if (t.id === "schedNext") { state.scheduleAnchor = iso(addDays(weekStart(state.scheduleAnchor), 7)); save(); render(); return; }
  if (t.id === "schedToday") { state.scheduleAnchor = iso(today()); save(); render(); return; }
  if (t.getAttribute("data-asgstatus")) { var aid = t.getAttribute("data-asgstatus"); var a = (state.schedule || []).find(function (x) { return x.id === aid; }); if (a) { var ni = (ASG_CYCLE.indexOf(a.status) + 1) % ASG_CYCLE.length; setAssignmentStatus(aid, ASG_CYCLE[ni]).then(function () { render(); }); } return; }
  if (t.getAttribute("data-asgremove")) { if (!window.confirm("Remover esta escalação?")) return; deleteAssignment(t.getAttribute("data-asgremove")).then(function () { render(); }); return; }
  if (t.getAttribute("data-teamdetail")) { state.teamDetail = t.getAttribute("data-teamdetail"); state.ministryDetail = null; save(); render(); return; }
  if (t.getAttribute("data-ministrydetail")) { state.ministryDetail = t.getAttribute("data-ministrydetail"); state.teamDetail = null; save(); render(); return; }
  if (t.getAttribute("data-ministryedit")) { ministryModal(ministryById(t.getAttribute("data-ministryedit"))); return; }
  if (t.getAttribute("data-memrole")) { memberRoleModal(t.getAttribute("data-memrole")); return; }
  if (t.getAttribute("data-makelead")) { setTeamLeader(t.getAttribute("data-team"), t.getAttribute("data-makelead")).then(function () { render(); }); return; }
  if (t.getAttribute("data-memremove")) { if (!window.confirm("Remover esta pessoa do time?")) return; removeTeamMember(t.getAttribute("data-memremove")).then(function () { render(); }); return; }
  if (t.id === "newMinistry") { ministryModal(null); return; }
  if (t.id === "newTeam") { teamModal(null); return; }
  if (t.id === "editTeam") { teamModal(teamById(t.getAttribute("data-team"))); return; }
  if (t.id === "teamsBack") { state.teamDetail = null; state.ministryDetail = null; state.scheduleView = false; save(); render(); return; }
  if (t.id === "tm-add") {
    var sel = document.getElementById("tm-stick"); if (!sel || !sel.value) return;
    addTeamMember(t.getAttribute("data-team"), sel.value, { role: val("tm-role") }).then(function () { render(); });
    return;
  }
});
