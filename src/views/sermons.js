// Study — Sermões (Step 5 · Fase 1): Sermon Library (cards + filtros) + editor
// básico. O corpo do sermão vive em `content` jsonb. Sem IA nesta fase (só o editor).
// Área de escrita ampla, quieta; estado vazio honesto.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc } from "../core/helpers.js";
import { createSermon, updateSermon } from "../core/sermons-repo.js";
import { render } from "../core/render.js";

var STATUS_LBL = { draft: "Rascunho", preparing: "Preparando", ready: "Pronto", preached: "Pregado", archived: "Arquivado" };
var VIS_LBL = { private: "Privado", leadership: "Liderança", church: "Igreja", public: "Público" };
var STATUS_BAND = { draft: "attention", preparing: "attention", ready: "healthy", preached: "healthy", archived: "risk" };

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function blankSermon() { return { id: null, title: "", subtitle: "", main_passage: "", big_idea: "", status: "draft", visibility: "church", campus: state.activeCampus, sermon_date: "", content: {} }; }

export function viewSermons() {
  if (state.sermonEdit) return sermonEditor(state.sermonEdit);
  var all = state.sermons || [];
  var f = state.sermonFilter || {};
  var list = all.filter(function (s) { return (!f.status || s.status === f.status) && (!f.campus || s.campus === f.campus); });
  var statusChips = '<div class="filtchips"><button class="fchip' + (!f.status ? " on" : "") + '" data-sermonstatus="__all__">Todos</button>' +
    ["draft", "preparing", "ready", "preached", "archived"].map(function (st) { return '<button class="fchip' + (f.status === st ? " on" : "") + '" data-sermonstatus="' + st + '">' + STATUS_LBL[st] + '</button>'; }).join("") + '</div>';
  var campusSel = '<select id="sermon-fcampus" style="margin-left:auto"><option value="">Todos os campus</option>' +
    state.institution.campuses.map(function (c) { return '<option' + (f.campus === c ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("") + '</select>';
  var cards = list.map(function (s) {
    return '<button class="gcard" data-sermon="' + s.id + '"><div class="gc-top"><span class="gc-name">' + esc(s.title || "(sem título)") + '</span><span class="hb ' + (STATUS_BAND[s.status] || "attention") + '">' + (STATUS_LBL[s.status] || s.status) + '</span></div><div class="gc-sub">' + (s.main_passage ? esc(s.main_passage) + ' · ' : '') + (s.campus ? esc(s.campus) + ' · ' : '') + (s.sermon_date ? s.sermon_date.split("-").reverse().join("/") : 'sem data') + '</div>' + (s.big_idea ? '<div class="gc-foot">' + esc(s.big_idea) + '</div>' : '') + '</button>';
  }).join("") || '<div class="empty">Nenhum sermão ainda. Comece o primeiro em “+ Novo sermão”.</div>';
  return '<div style="display:flex;align-items:flex-start;margin-bottom:16px"><div><h1 class="page">Estudo</h1><p class="sub" style="margin:0">Onde a igreja prepara e preserva o ensino. A Bíblia é a fundação; o Tally organiza.</p></div><button class="btn" id="newSermon" style="margin-left:auto">+ Novo sermão</button></div>' +
    '<div class="ph" style="margin-bottom:14px">' + statusChips + campusSel + '</div>' +
    '<div class="gcards">' + cards + '</div>';
}

function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (sel === k ? " selected" : "") + '>' + map[k] + '</option>'; }).join(""); }

function sermonEditor(id) {
  var s = id === "__new__" ? blankSermon() : ((state.sermons || []).find(function (x) { return x.id === id; }) || blankSermon());
  var c = s.content || {};
  var campusSel = '<select id="se-campus">' + state.institution.campuses.map(function (cp) { return '<option' + (s.campus === cp ? " selected" : "") + '>' + esc(cp) + '</option>'; }).join("") + '</select>';
  function ta(idf, label, v, ph) { return '<div class="field"><label>' + label + '</label><textarea id="' + idf + '" rows="4" placeholder="' + ph + '">' + esc(v || "") + '</textarea></div>'; }
  return '<button class="link" id="sermonBack">&#8592; Voltar à biblioteca</button>' +
    '<div style="margin:10px 0 16px"><h1 class="page">' + (id === "__new__" ? "Novo sermão" : esc(s.title || "(sem título)")) + '</h1><p class="sub" style="margin:0">Editor — título, passagem, big idea e as seções do sermão.</p></div>' +
    '<div class="row2"><div class="panel">' +
    '<div class="field"><label>Título</label><input id="se-title" value="' + esc(s.title) + '" placeholder="Ex.: O Bom Pastor"></div>' +
    '<div class="field"><label>Subtítulo</label><input id="se-subtitle" value="' + esc(s.subtitle) + '" placeholder="Opcional"></div>' +
    '<div class="mrow"><div class="field"><label>Passagem principal</label><input id="se-passage" value="' + esc(s.main_passage) + '" placeholder="Ex.: John 10:1-18"></div><div class="field"><label>Data</label><input id="se-date" type="date" value="' + esc(s.sermon_date) + '"></div></div>' +
    '<div class="field"><label>Big idea</label><input id="se-bigidea" value="' + esc(s.big_idea) + '" placeholder="A ideia central em uma frase"></div>' +
    '<div class="mrow"><div class="field"><label>Status</label><select id="se-status">' + opts(STATUS_LBL, s.status) + '</select></div><div class="field"><label>Quem vê</label><select id="se-vis">' + opts(VIS_LBL, s.visibility) + '</select></div></div>' +
    '<div class="field"><label>Campus</label>' + campusSel + '</div>' +
    '</div><div class="panel">' +
    ta("se-outline", "Outline (introdução, pontos)", c.outline, "1. ...\n2. ...") +
    ta("se-notes", "Notas", c.notes, "Texto livre de estudo") +
    ta("se-illus", "Ilustrações", c.illustrations, "Histórias, exemplos") +
    ta("se-appl", "Aplicação", c.application, "Como isso toca a vida da igreja") +
    '<div class="actions"><button class="btn ghost" id="se-cancel">Cancelar</button><button class="btn" id="se-save" data-id="' + (s.id || "") + '">Salvar sermão</button></div>' +
    '</div></div>';
}

document.addEventListener("change", function (e) {
  var t = e.target; if (t && t.id === "sermon-fcampus") { state.sermonFilter = Object.assign({}, state.sermonFilter, { campus: t.value || null }); save(); render(); }
});

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-sermon],[data-sermonstatus],#newSermon,#sermonBack,#se-cancel,#se-save") : null; if (!t) return;
  if (t.getAttribute("data-sermonstatus")) { var v = t.getAttribute("data-sermonstatus"); state.sermonFilter = Object.assign({}, state.sermonFilter, { status: v === "__all__" ? null : v }); save(); render(); return; }
  if (t.id === "newSermon") { state.sermonEdit = "__new__"; save(); render(); return; }
  if (t.getAttribute("data-sermon")) { state.sermonEdit = t.getAttribute("data-sermon"); save(); render(); return; }
  if (t.id === "sermonBack" || t.id === "se-cancel") { state.sermonEdit = null; save(); render(); return; }
  if (t.id === "se-save") {
    var title = val("se-title").trim(); if (!title) { var el = document.getElementById("se-title"); if (el) el.focus(); return; }
    var id = t.getAttribute("data-id");
    var existing = id ? (state.sermons || []).find(function (x) { return x.id === id; }) : null;
    var content = Object.assign({}, existing ? existing.content : {}, { outline: val("se-outline"), notes: val("se-notes"), illustrations: val("se-illus"), application: val("se-appl") });
    var data = { title: title, subtitle: val("se-subtitle").trim(), main_passage: val("se-passage").trim(), big_idea: val("se-bigidea").trim(), status: val("se-status"), visibility: val("se-vis"), campus: val("se-campus"), sermon_date: val("se-date"), content: content };
    if (id) { updateSermon(id, data); } else { createSermon(data).then(function (newId) { if (newId) { /* já entrou no state */ } }); }
    state.sermonEdit = null; save(); render();
  }
});
