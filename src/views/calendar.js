// Agenda — Calendário unificado (Step 6 · Fase 5). Agrega o que tem data real:
// Cultos (services, recorrência por weekday), Eventos (event_date) e Escala
// (schedule_assignments, assignment_date). Views Agenda/Semana/Mês, filtro por tipo,
// campus-aware (respeita o campus ativo). Só dado real; nada de evento fake.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc } from "../core/helpers.js";
import { render } from "../core/render.js";

var WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
var MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
var KIND_LBL = { service: "Culto", event: "Evento", schedule: "Escala" };
var KIND_COLOR = { service: "var(--blue)", event: "#8b74e8", schedule: "var(--green)" };

function parseIso(s) { var p = (s || "").split("-"); return new Date(+p[0], (+p[1]) - 1, +p[2]); }
function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d) { var x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }
function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function anchorDate() { return state.calAnchor ? parseIso(state.calAnchor) : today0(); }
function brDate(s) { return s ? s.split("-").reverse().join("/") : ""; }
function inCampusItem(campus) { return !campus || campus === state.activeCampus; }
function firstWeekdayOfMonth(year, month, weekday) { var d = new Date(year, month, 1); while (d.getDay() !== weekday) d.setDate(d.getDate() + 1); return d; }

// Gera as ocorrências dentro de [from, to] (Dates), respeitando campus e filtro de tipo.
function occurrences(from, to) {
  var tf = state.calTypeFilter || null; // null=tudo
  var out = [];
  var fromIso = ymd(from), toIso = ymd(to);

  if (!tf || tf === "event") {
    (state.events || []).forEach(function (e) {
      if (!inCampusItem(e.campus) || !e.event_date) return;
      if (e.event_date < fromIso || e.event_date > toIso) return;
      out.push({ date: e.event_date, kind: "event", title: e.name || "(sem nome)", sub: (e.start_time || "") + (e.type ? (e.start_time ? " · " : "") + e.type : ""), id: e.id });
    });
  }
  if (!tf || tf === "service") {
    (state.services || []).forEach(function (s) {
      if (s.active === false || !inCampusItem(s.campus) || s.weekday == null) return;
      if (s.recurring_pattern === "custom") return; // custom não é projetado na grade
      if (s.recurring_pattern === "monthly") {
        // 1ª ocorrência do weekday em cada mês do range
        var d = new Date(from.getFullYear(), from.getMonth(), 1);
        while (d <= to) {
          var occ = firstWeekdayOfMonth(d.getFullYear(), d.getMonth(), s.weekday);
          if (occ >= from && occ <= to) out.push({ date: ymd(occ), kind: "service", title: s.name || "(sem nome)", sub: (s.start_time || "") + (s.type ? (s.start_time ? " · " : "") + s.type : ""), id: s.id });
          d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        }
      } else { // weekly
        var cur = new Date(from);
        while (cur <= to) {
          if (cur.getDay() === s.weekday) out.push({ date: ymd(cur), kind: "service", title: s.name || "(sem nome)", sub: (s.start_time || "") + (s.type ? (s.start_time ? " · " : "") + s.type : ""), id: s.id });
          cur = addDays(cur, 1);
        }
      }
    });
  }
  if (!tf || tf === "schedule") {
    var teamNames = {}; (state.teams || []).forEach(function (tm) { teamNames[tm.id] = tm.name; });
    var pnames = {}; (state.people || []).forEach(function (p) { pnames[p.id] = p.name; });
    (state.schedule || []).forEach(function (a) {
      if (!a.assignment_date || a.assignment_date < fromIso || a.assignment_date > toIso) return;
      out.push({ date: a.assignment_date, kind: "schedule", title: (teamNames[a.team_id] || "Escala"), sub: [a.role, a.stick_id ? pnames[a.stick_id] : ""].filter(Boolean).join(" · "), id: a.id });
    });
  }
  out.sort(function (a, b) { return a.date.localeCompare(b.date) || (a.title || "").localeCompare(b.title || ""); });
  return out;
}

function chip(kind) { return '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + KIND_COLOR[kind] + ';margin-right:6px;flex:none"></span>'; }

function header() {
  var views = [["agenda", "Agenda"], ["week", "Semana"], ["month", "Mês"]];
  var cur = state.calView || "agenda";
  var viewChips = '<div class="filtchips">' + views.map(function (v) { return '<button class="fchip' + (cur === v[0] ? " on" : "") + '" data-calview="' + v[0] + '">' + v[1] + '</button>'; }).join("") + '</div>';
  var types = [["", "Tudo"], ["service", "Cultos"], ["event", "Eventos"], ["schedule", "Escala"]];
  var tf = state.calTypeFilter || "";
  var typeChips = '<div class="filtchips">' + types.map(function (t) { return '<button class="fchip' + (tf === t[0] ? " on" : "") + '" data-caltype="' + t[0] + '">' + t[1] + '</button>'; }).join("") + '</div>';
  var nav = (cur === "agenda") ? '' : '<div style="display:flex;align-items:center;gap:8px;margin-left:auto"><button class="btn ghost sm" id="calPrev">‹</button><b id="calLabel">' + esc(periodLabel()) + '</b><button class="btn ghost sm" id="calNext">›</button><button class="btn ghost sm" id="calToday">Hoje</button></div>';
  return '<div style="margin-bottom:14px"><h1 class="page">Agenda</h1><p class="sub" style="margin:0">Cultos, eventos e escala num só lugar — só o que realmente tem data. Campus: ' + esc(state.activeCampus) + '.</p></div>' +
    '<div class="ph" style="margin-bottom:12px;align-items:flex-start;gap:14px;flex-wrap:wrap">' + viewChips + typeChips + nav + '</div>';
}

function periodLabel() {
  var a = anchorDate();
  if ((state.calView || "agenda") === "month") return MONTHS[a.getMonth()] + " " + a.getFullYear();
  var ws = startOfWeek(a); var we = addDays(ws, 6);
  return brDate(ymd(ws)).slice(0, 5) + " – " + brDate(ymd(we)).slice(0, 5);
}

function agendaView() {
  var from = today0(); var to = addDays(from, 60);
  var occ = occurrences(from, to);
  if (!occ.length) return '<div class="empty">Nada agendado nos próximos 60 dias. Cadastre cultos e eventos, ou monte a escala em Times.</div>';
  var byDay = {}; occ.forEach(function (o) { (byDay[o.date] || (byDay[o.date] = [])).push(o); });
  var days = Object.keys(byDay).sort();
  var todayIso = ymd(today0());
  return days.map(function (d) {
    var dt = parseIso(d);
    var head = '<div class="ph" style="margin:10px 0 4px"><h3 style="margin:0;font-size:14px' + (d === todayIso ? ';color:var(--blue)' : '') + '">' + WD_SHORT[dt.getDay()] + ' ' + brDate(d) + (d === todayIso ? ' · hoje' : '') + '</h3></div>';
    var items = byDay[d].map(function (o) {
      return '<div class="li"><div style="flex:1;display:flex;align-items:center">' + chip(o.kind) + '<div><div><b>' + esc(o.title) + '</b> <span class="muted">· ' + KIND_LBL[o.kind] + '</span></div>' + (o.sub ? '<div class="meta">' + esc(o.sub) + '</div>' : '') + '</div></div><div class="right"><button class="link" data-calopen="' + o.kind + ':' + o.id + '">abrir</button></div></div>';
    }).join("");
    return head + '<div class="panel" style="padding:6px 14px">' + items + '</div>';
  }).join("");
}

function weekView() {
  var ws = startOfWeek(anchorDate());
  var to = addDays(ws, 6);
  var occ = occurrences(ws, to);
  var byDay = {}; occ.forEach(function (o) { (byDay[o.date] || (byDay[o.date] = [])).push(o); });
  var todayIso = ymd(today0());
  var cols = [];
  for (var i = 0; i < 7; i++) {
    var d = addDays(ws, i); var di = ymd(d);
    var items = (byDay[di] || []).map(function (o) {
      return '<button class="li" data-calopen="' + o.kind + ':' + o.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer;padding:6px 0;display:block"><div style="display:flex;align-items:center">' + chip(o.kind) + '<b style="font-size:12.5px">' + esc(o.title) + '</b></div>' + (o.sub ? '<div class="meta" style="margin-left:13px">' + esc(o.sub) + '</div>' : '') + '</button>';
    }).join("") || '<div class="muted" style="padding:6px 0">—</div>';
    cols.push('<div class="panel" style="padding:10px' + (di === todayIso ? ';outline:2px solid var(--blue)' : '') + '"><div class="mi-k" style="font-size:11px;margin-bottom:4px">' + WD_SHORT[d.getDay()] + ' ' + brDate(di).slice(0, 5) + '</div>' + items + '</div>');
  }
  return '<div class="row2" style="grid-template-columns:repeat(7,1fr);gap:8px">' + cols.join("") + '</div>';
}

function monthView() {
  var a = anchorDate();
  var first = new Date(a.getFullYear(), a.getMonth(), 1);
  var gridStart = startOfWeek(first);
  var monthEnd = new Date(a.getFullYear(), a.getMonth() + 1, 0);
  var gridEnd = addDays(startOfWeek(monthEnd), 6);
  var occ = occurrences(gridStart, gridEnd);
  var byDay = {}; occ.forEach(function (o) { (byDay[o.date] || (byDay[o.date] = [])).push(o); });
  var todayIso = ymd(today0());
  var headRow = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px">' + WD_SHORT.map(function (w) { return '<div class="mi-k" style="font-size:11px;text-align:center">' + w + '</div>'; }).join("") + '</div>';
  var cells = []; var cur = new Date(gridStart);
  while (cur <= gridEnd) {
    var di = ymd(cur); var inMonth = cur.getMonth() === a.getMonth();
    var items = (byDay[di] || []).slice(0, 3).map(function (o) {
      return '<button data-calopen="' + o.kind + ':' + o.id + '" title="' + esc(o.title) + '" style="display:block;width:100%;text-align:left;background:none;border:0;cursor:pointer;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)">' + chip(o.kind) + esc(o.title) + '</button>';
    }).join("");
    var more = (byDay[di] || []).length > 3 ? '<div class="muted" style="font-size:9px">+' + ((byDay[di] || []).length - 3) + '</div>' : '';
    cells.push('<div style="min-height:74px;border:1px solid var(--border);border-radius:8px;padding:4px 5px;background:' + (inMonth ? "var(--surface)" : "transparent") + (di === todayIso ? ";outline:2px solid var(--blue)" : "") + '"><div style="font-size:11px;font-weight:600;' + (inMonth ? "" : "opacity:.4;") + 'margin-bottom:2px">' + cur.getDate() + '</div>' + items + more + '</div>');
    cur = addDays(cur, 1);
  }
  return headRow + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">' + cells.join("") + '</div>';
}

export function viewCalendar() {
  var v = state.calView || "agenda";
  var body = v === "week" ? weekView() : v === "month" ? monthView() : agendaView();
  return header() + body;
}

function shiftAnchor(dir) {
  var a = anchorDate();
  if ((state.calView || "agenda") === "month") a = new Date(a.getFullYear(), a.getMonth() + dir, 1);
  else a = addDays(startOfWeek(a), dir * 7);
  state.calAnchor = ymd(a); save(); render();
}

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-calview],[data-caltype],[data-calopen],#calPrev,#calNext,#calToday") : null; if (!t) return;
  if (t.getAttribute("data-calview")) { state.calView = t.getAttribute("data-calview"); save(); render(); return; }
  if (t.getAttribute("data-caltype")) { state.calTypeFilter = t.getAttribute("data-caltype") || null; save(); render(); return; }
  if (t.getAttribute("data-calopen")) {
    var v = t.getAttribute("data-calopen"); var kind = v.split(":")[0], id = v.slice(kind.length + 1);
    if (kind === "service") { state.view = "services"; state.serviceDetail = id; }
    else if (kind === "event") { state.view = "events"; state.eventDetail = id; }
    else if (kind === "schedule") { state.view = "teams"; state.scheduleView = true; }
    save(); render(); return;
  }
  if (t.id === "calPrev") { shiftAnchor(-1); return; }
  if (t.id === "calNext") { shiftAnchor(1); return; }
  if (t.id === "calToday") { state.calAnchor = null; save(); render(); return; }
});
