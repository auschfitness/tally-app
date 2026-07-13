// Study — Sermões (Step 5 · Fase 1) + Séries (Fase 2): Sermon Library (cards +
// filtros), editor básico, e Séries — a jornada de ensino que agrupa sermões.
// A Library agrupa/filtra por série; a série tem um workspace (visão/tema,
// escrituras-chave derivadas das passagens reais, cronograma dos sermões).
// Sem IA nesta fase. Área de escrita ampla, quieta; estado vazio honesto.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc } from "../core/helpers.js";
import { createSermon, updateSermon } from "../core/sermons-repo.js";
import { createSeries, updateSeries, setSermonSeries } from "../core/series-repo.js";
import { syncSermonScriptures } from "../core/scriptures-repo.js";
import { parseRefs } from "../core/scripture-parse.js";
import { fetchPassage } from "../core/bible-source.js";
import { BOOKS, bookName } from "../core/bible-books.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

var STATUS_LBL = { draft: "Rascunho", preparing: "Preparando", ready: "Pronto", preached: "Pregado", archived: "Arquivado" };
var VIS_LBL = { private: "Privado", leadership: "Liderança", church: "Igreja", public: "Público" };
var STATUS_BAND = { draft: "attention", preparing: "attention", ready: "healthy", preached: "healthy", archived: "risk" };
var SERIES_LBL = { planning: "Planejando", active: "Ativa", completed: "Concluída", archived: "Arquivada" };
var SERIES_BAND = { planning: "attention", active: "healthy", completed: "healthy", archived: "risk" };

var SECTIONS = [
  { key: "outline", id: "se-outline", label: "Outline", ph: "Introdução, pontos, sub-pontos…" },
  { key: "notes", id: "se-notes", label: "Notas", ph: "Texto livre de estudo" },
  { key: "illustrations", id: "se-illus", label: "Ilustrações", ph: "Histórias, exemplos, imagens" },
  { key: "application", id: "se-appl", label: "Aplicação", ph: "Como isso toca a vida da igreja" },
  { key: "prayer_response", id: "se-prayer", label: "Resposta de oração", ph: "Como responder a Deus a partir deste texto" },
];

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function gid(id) { return document.getElementById(id); }
function blankSermon() { return { id: null, title: "", subtitle: "", main_passage: "", big_idea: "", status: "draft", visibility: "church", campus: state.activeCampus, sermon_date: "", series_id: null, content: {} }; }
function brDate(d) { return d ? d.split("-").reverse().join("/") : ""; }
function seriesById(id) { return (state.series || []).find(function (x) { return x.id === id; }) || null; }

// ——— Editor canvas: autosave discreto (sem re-render, preserva o cursor) ———
var editingId = null, saveTimer = null, creating = false;
var STATUS_TXT = { editing: "Editando…", saving: "Salvando…", saved: "Salvo", untitled: "Dê um título para salvar", error: "Não foi possível salvar" };
function setStatus(k) { var el = gid("sd-status"); if (el) el.textContent = STATUS_TXT[k] || k; }
function collectSermon() {
  var existing = editingId ? (state.sermons || []).find(function (x) { return x.id === editingId; }) : null;
  var content = Object.assign({}, existing ? existing.content : {});
  SECTIONS.forEach(function (s) { content[s.key] = val(s.id); });
  return {
    title: val("se-title").trim(), subtitle: val("se-subtitle").trim(),
    main_passage: val("se-passage").trim(), big_idea: val("se-bigidea").trim(),
    status: val("se-status") || "draft", visibility: val("se-vis") || "church",
    campus: val("se-campus"), sermon_date: val("se-date"),
    series_id: val("se-series") || null, content: content,
  };
}
// Passagens do sermão atual: a passagem principal SEMPRE conta; o texto das seções
// só é varrido quando o reconhecimento está ligado (toggle do dono).
function refsForCurrent() {
  var txt = val("se-passage");
  if (state.scriptureOn !== false) { SECTIONS.forEach(function (sec) { txt += "\n" + val(sec.id); }); }
  return parseRefs(txt);
}
function syncCurrent(id) { if (id) syncSermonScriptures(id, refsForCurrent()).then(refreshDetected); }
function doAutosave() {
  var data = collectSermon();
  if (!data.title) { setStatus("untitled"); return; }
  if (editingId) { setStatus("saving"); updateSermon(editingId, data).then(function () { setStatus("saved"); syncCurrent(editingId); }); return; }
  if (creating) return;
  creating = true; setStatus("saving");
  createSermon(data).then(function (nid) { creating = false; if (nid) { editingId = nid; state.sermonEdit = nid; setStatus("saved"); syncCurrent(nid); } else setStatus("error"); });
}
function scheduleSave() { setStatus("editing"); clearTimeout(saveTimer); saveTimer = setTimeout(doAutosave, 900); }
function flushSave() { clearTimeout(saveTimer); doAutosave(); }
// Cresce as textareas do canvas conforme o conteúdo (chamado no mount via render.js).
export function sizeSermonDocs() {
  var docs = document.querySelectorAll(".sd-doc"); for (var i = 0; i < docs.length; i++) { var d = docs[i]; d.style.height = "auto"; d.style.height = d.scrollHeight + "px"; }
}
function showDrawer(open) { var d = gid("sd-drawer"), o = gid("sd-drawer-ov"); if (d) d.style.display = open ? "block" : "none"; if (o) o.style.display = open ? "block" : "none"; }

// ——— Zona direita: assistente de estudo (painel de escritura da Fase 3) ———
var detectedRefs = [];
// Sermões que já pregaram esta passagem (mesmo livro+capítulo), fora o atual.
function sermonsUsing(ref) {
  var ids = {};
  (state.scriptures || []).forEach(function (x) { if (x.book === ref.book && x.chapter === ref.chapter && x.sermon_id !== editingId) ids[x.sermon_id] = 1; });
  return Object.keys(ids).map(function (id) { return (state.sermons || []).find(function (s) { return s.id === id; }); }).filter(Boolean);
}
// Recalcula os chips de referências detectadas (lê o DOM, sem re-render).
export function refreshDetected() {
  var box = gid("sd-detected"); if (!box) return;
  detectedRefs = refsForCurrent();
  if (state.scriptureOn === false) { box.innerHTML = '<div class="muted">Reconhecimento desligado. A passagem principal ainda é registrada.</div>'; return; }
  if (!detectedRefs.length) { box.innerHTML = '<div class="muted">Nenhuma referência reconhecida ainda. Escreva "João 10:1-18", "Rm 8:28"…</div>'; return; }
  box.innerHTML = detectedRefs.map(function (r, i) { return '<button class="chip sd-ref" style="background:rgba(43,92,230,.10);color:var(--blue);border:none;cursor:pointer" data-refi="' + i + '">' + esc(r.reference) + '</button>'; }).join(" ");
}
// Abre o painel de uma referência: texto (via API, erro honesto) + histórico da igreja.
function openScripturePanel(ref) {
  var box = gid("sd-panel"); if (!box || !ref) return;
  var hist = sermonsUsing(ref);
  var histHtml = hist.length ? '<div class="sd-h" style="margin-top:16px">Você já pregou sobre isto</div>' + hist.map(function (s) { return '<button class="li" data-sermon="' + s.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer;padding:8px 0"><div style="flex:1"><b>' + esc(s.title || "(sem título)") + '</b>' + (s.sermon_date ? ' <span class="muted">· ' + brDate(s.sermon_date) + '</span>' : '') + '</div></button>'; }).join("") : '<div class="muted" style="margin-top:14px">Primeira vez que a igreja aborda esta passagem por aqui.</div>';
  box.innerHTML = '<div class="sd-h">' + esc(ref.reference) + '</div><div class="muted" id="sd-passage-text">Carregando o texto…</div>' + histHtml;
  fetchPassage(ref).then(function (res) {
    var t = gid("sd-passage-text"); if (!t) return;
    if (res && res.ok) {
      t.className = ""; t.style.lineHeight = "1.7"; t.style.fontSize = "14px";
      t.innerHTML = res.verses.map(function (v) { return '<sup style="color:var(--text-2);margin-right:3px">' + v.n + '</sup>' + esc(v.text); }).join(" ") + '<div class="muted" style="margin-top:8px">Versão: ' + esc(res.translationId || "") + '</div>';
    } else {
      t.textContent = (res && res.error) || "Não foi possível carregar a versão agora.";
    }
  });
}
function toggleAssistant(open) {
  var body = gid("sd-body-el"), z = gid("sd-asst");
  if (!body || !z) return;
  var show = open === undefined ? z.style.display === "none" : open;
  z.style.display = show ? "block" : "none";
  if (show) body.classList.add("asst"); else body.classList.remove("asst");
  if (show) { refreshDetected(); requestAnimationFrame(sizeSermonDocs); }
}

// ——— Scripture Map: cobertura dos 66 livros por uso real em sermões ———
function coverage() {
  var by = {}; // code → set de sermon_ids
  (state.scriptures || []).forEach(function (x) { (by[x.book] || (by[x.book] = {}))[x.sermon_id] = 1; });
  var out = {}, max = 0;
  Object.keys(by).forEach(function (code) { var n = Object.keys(by[code]).length; out[code] = n; if (n > max) max = n; });
  return { count: out, max: max };
}
function scriptureMapView() {
  var cov = coverage();
  var total = Object.keys(cov.count).length;
  var grid = BOOKS.map(function (b) {
    var n = cov.count[b.code] || 0;
    var alpha = n ? (0.14 + 0.66 * (n / (cov.max || 1))) : 0;
    var bg = n ? "rgba(43,92,230," + alpha.toFixed(2) + ")" : "var(--surface-2)";
    var col = n && alpha > 0.5 ? "#fff" : "var(--text)";
    var sel = state.scriptureMapBook === b.code ? ";outline:2px solid var(--blue)" : "";
    return '<button class="smap-cell" data-mapbook="' + b.code + '" title="' + esc(b.pt) + (n ? ' · ' + n + ' sermão' + (n !== 1 ? 'es' : '') : ' · sem uso') + '" style="background:' + bg + ';color:' + col + sel + '">' + esc(b.pt) + (n ? '<span class="smap-n">' + n + '</span>' : '') + '</button>';
  }).join("");

  var detail = "";
  if (state.scriptureMapBook) {
    var code = state.scriptureMapBook;
    var rows = (state.scriptures || []).filter(function (x) { return x.book === code; });
    var bySermon = {}; rows.forEach(function (x) { (bySermon[x.sermon_id] || (bySermon[x.sermon_id] = [])).push(x.reference); });
    var items = Object.keys(bySermon).map(function (id) {
      var s = (state.sermons || []).find(function (x) { return x.id === id; }); if (!s) return "";
      return '<button class="li" data-sermon="' + id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>' + esc(s.title || "(sem título)") + '</b>' + (s.sermon_date ? ' <span class="muted">· ' + brDate(s.sermon_date) + '</span>' : '') + '<div class="meta">' + esc(bySermon[id].join(" · ")) + '</div></div></button>';
    }).join("");
    detail = '<div class="panel" style="margin-top:16px"><div class="ph"><h3>' + esc(bookName(code)) + '</h3><span class="muted" style="margin-left:auto">' + Object.keys(bySermon).length + ' sermão' + (Object.keys(bySermon).length !== 1 ? 'es' : '') + '</span></div>' + (items || '<div class="empty">Nenhum sermão usou este livro ainda.</div>') + '</div>';
  }

  var body = total ? '<div class="smap">' + grid + '</div>' + detail : '<div class="empty">Nenhuma passagem registrada ainda. O mapa se preenche conforme você escreve sermões com referências.</div>';
  return '<button class="link" id="mapBack">&#8592; Voltar à biblioteca</button>' +
    '<div style="margin:10px 0 16px"><h1 class="page">Mapa de Escrituras</h1><p class="sub" style="margin:0">A história de ensino da igreja: quais livros já foram pregados, e com que intensidade. Dados reais dos sermões.</p></div>' + body;
}

export function viewSermons() {
  if (state.seriesDetail) return seriesWorkspace(state.seriesDetail);
  if (state.sermonEdit) return sermonEditor(state.sermonEdit);
  if (state.scriptureMap) return scriptureMapView();
  var all = state.sermons || [];
  var series = state.series || [];
  var f = state.sermonFilter || {};
  var list = all.filter(function (s) {
    return (!f.status || s.status === f.status) &&
      (!f.campus || s.campus === f.campus) &&
      (!f.series || (f.series === "__none__" ? !s.series_id : s.series_id === f.series));
  });

  // Séries — a jornada de ensino que agrupa sermões.
  var seriesCards = series.map(function (se) {
    var n = all.filter(function (x) { return x.series_id === se.id; }).length;
    return '<button class="gcard" data-seriesdetail="' + se.id + '"><div class="gc-top"><span class="gc-name">' + esc(se.title || "(sem título)") + '</span><span class="hb ' + (SERIES_BAND[se.status] || "attention") + '">' + (SERIES_LBL[se.status] || se.status) + '</span></div><div class="gc-sub">' + (se.theme ? esc(se.theme) + ' · ' : '') + n + ' sermã' + (n === 1 ? 'o' : 'os') + '</div>' + (se.description ? '<div class="gc-foot">' + esc(se.description) + '</div>' : '') + '</button>';
  }).join("") || '<div class="empty">Nenhuma série ainda. Agrupe sermões numa jornada de ensino em “+ Nova série”.</div>';
  var seriesBlock = '<div class="ph" style="margin-bottom:8px"><h3 style="margin:0">Séries</h3><button class="btn ghost" id="newSeries" style="margin-left:auto">+ Nova série</button></div>' +
    '<div class="gcards" style="margin-bottom:22px">' + seriesCards + '</div>';

  // Filtros da Library.
  var statusChips = '<div class="filtchips"><button class="fchip' + (!f.status ? " on" : "") + '" data-sermonstatus="__all__">Todos</button>' +
    ["draft", "preparing", "ready", "preached", "archived"].map(function (st) { return '<button class="fchip' + (f.status === st ? " on" : "") + '" data-sermonstatus="' + st + '">' + STATUS_LBL[st] + '</button>'; }).join("") + '</div>';
  var seriesFilt = '<select id="sermon-fseries" style="margin-left:auto"><option value="">Todas as séries</option><option value="__none__"' + (f.series === "__none__" ? " selected" : "") + '>Sem série</option>' +
    series.map(function (se) { return '<option value="' + se.id + '"' + (f.series === se.id ? " selected" : "") + '>' + esc(se.title || "(sem título)") + '</option>'; }).join("") + '</select>';
  var campusSel = '<select id="sermon-fcampus"><option value="">Todos os campus</option>' +
    state.institution.campuses.map(function (c) { return '<option' + (f.campus === c ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("") + '</select>';

  // Cards — agrupados por série quando há séries; flat quando não há.
  function card(s) {
    var se = s.series_id ? seriesById(s.series_id) : null;
    var meta = (s.main_passage ? esc(s.main_passage) + ' · ' : '') + (s.campus ? esc(s.campus) + ' · ' : '') + (s.sermon_date ? brDate(s.sermon_date) : 'sem data') + (se ? ' · ' + esc(se.title) : '');
    return '<button class="gcard" data-sermon="' + s.id + '"><div class="gc-top"><span class="gc-name">' + esc(s.title || "(sem título)") + '</span><span class="hb ' + (STATUS_BAND[s.status] || "attention") + '">' + (STATUS_LBL[s.status] || s.status) + '</span></div><div class="gc-sub">' + meta + '</div>' + (s.big_idea ? '<div class="gc-foot">' + esc(s.big_idea) + '</div>' : '') + '</button>';
  }
  var cardsHtml;
  if (!list.length) {
    cardsHtml = '<div class="empty">Nenhum sermão ainda. Comece o primeiro em “+ Novo sermão”.</div>';
  } else if (!series.length) {
    cardsHtml = '<div class="gcards">' + list.map(card).join("") + '</div>';
  } else {
    var groups = [];
    series.forEach(function (se) { var items = list.filter(function (x) { return x.series_id === se.id; }); if (items.length) groups.push({ label: se.title || "(sem título)", items: items }); });
    var loose = list.filter(function (x) { return !x.series_id; }); if (loose.length) groups.push({ label: "Sem série", items: loose });
    cardsHtml = groups.map(function (g) { return '<div class="ph" style="margin:4px 0 6px"><h3 class="muted" style="margin:0;font-size:13px;font-weight:600">' + esc(g.label) + '</h3></div><div class="gcards" style="margin-bottom:16px">' + g.items.map(card).join("") + '</div>'; }).join("");
  }

  return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px"><div><h1 class="page">Estudo</h1><p class="sub" style="margin:0">Onde a igreja prepara e preserva o ensino. A Bíblia é a fundação; o Tally organiza.</p></div><button class="btn ghost" id="openMap" style="margin-left:auto">Mapa de Escrituras</button><button class="btn" id="newSermon">+ Novo sermão</button></div>' +
    seriesBlock +
    '<div class="ph" style="margin-bottom:14px">' + statusChips + campusSel + seriesFilt + '</div>' +
    cardsHtml;
}

function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (sel === k ? " selected" : "") + '>' + map[k] + '</option>'; }).join(""); }

// Editor de sermão como CANVAS (spec §6-7, §24): título como H1 de documento,
// passagem + big idea como subcabeçalho leve, seções como blocos no fluxo. Metadados
// recolhidos num drawer de Propriedades. Autosave discreto. A zona direita (assistente
// de estudo) nasce vazia aqui e recebe o painel de escritura na Fase 3.
function sermonEditor(id) {
  var isNew = id === "__new__";
  var s = isNew ? blankSermon() : ((state.sermons || []).find(function (x) { return x.id === id; }) || blankSermon());
  editingId = isNew ? null : s.id; creating = false; clearTimeout(saveTimer);
  var c = s.content || {};

  var rail = '<aside class="sd-rail"><div class="sd-rail-h">Estrutura</div>' +
    '<button class="sd-nav" data-goto="sec-top">Título &amp; ideia</button>' +
    SECTIONS.map(function (sec) { return '<button class="sd-nav" data-goto="sec-' + sec.key + '">' + sec.label + '</button>'; }).join("") +
    '</aside>';

  var blocks = SECTIONS.map(function (sec) {
    return '<section class="sd-block" id="sec-' + sec.key + '"><div class="sd-h">' + sec.label + '</div>' +
      '<textarea id="' + sec.id + '" class="sd-doc" placeholder="' + sec.ph + '">' + esc(c[sec.key] || "") + '</textarea></section>';
  }).join("");

  var canvas = '<main class="sd-canvas">' +
    '<div id="sec-top">' +
    '<input id="se-title" class="sd-title" value="' + esc(s.title) + '" placeholder="Sem título">' +
    '<div class="sd-subhead">' +
    '<input id="se-passage" class="sd-passage" value="' + esc(s.main_passage) + '" placeholder="Passagem principal — ex.: John 10:1-18">' +
    '<input id="se-bigidea" class="sd-bigidea" value="' + esc(s.big_idea) + '" placeholder="Big idea — a ideia central em uma frase">' +
    '</div></div>' + blocks + '</main>';

  // Propriedades (drawer): metadados fora do caminho de escrita.
  var campusSel = '<select id="se-campus">' + state.institution.campuses.map(function (cp) { return '<option' + (s.campus === cp ? " selected" : "") + '>' + esc(cp) + '</option>'; }).join("") + '</select>';
  var seriesSel = '<select id="se-series"><option value="">Sem série</option>' + (state.series || []).map(function (se) { return '<option value="' + se.id + '"' + (s.series_id === se.id ? " selected" : "") + '>' + esc(se.title || "(sem título)") + '</option>'; }).join("") + '</select>';
  var drawer = '<div class="drawer-ov" id="sd-drawer-ov" style="display:none"></div>' +
    '<aside class="drawer sd-props" id="sd-drawer" style="display:none"><div class="ph"><h3>Propriedades</h3><button class="link" id="sd-props-close" style="margin-left:auto">Fechar</button></div>' +
    '<div class="field"><label>Subtítulo</label><input id="se-subtitle" value="' + esc(s.subtitle) + '" placeholder="Opcional"></div>' +
    '<div class="mrow"><div class="field"><label>Status</label><select id="se-status">' + opts(STATUS_LBL, s.status) + '</select></div><div class="field"><label>Quem vê</label><select id="se-vis">' + opts(VIS_LBL, s.visibility) + '</select></div></div>' +
    '<div class="mrow"><div class="field"><label>Campus</label>' + campusSel + '</div><div class="field"><label>Data</label><input id="se-date" type="date" value="' + esc(s.sermon_date) + '"></div></div>' +
    '<div class="field"><label>Série</label>' + seriesSel + '</div>' +
    '</aside>';

  // Zona direita — assistente de estudo (painel de escritura). Oculta por padrão.
  var asst = '<aside class="sd-asst" id="sd-asst" style="display:none">' +
    '<div class="ph" style="margin-bottom:10px"><h3 style="font-size:14px">Assistente de estudo</h3></div>' +
    '<label class="sd-recog"><input type="checkbox" id="sd-recog"' + (state.scriptureOn === false ? "" : " checked") + '> Reconhecer escrituras</label>' +
    '<div class="sd-h" style="margin-top:16px">Referências</div>' +
    '<div id="sd-detected"></div>' +
    '<div id="sd-panel" style="margin-top:16px"></div>' +
    '</aside>';

  var bar = '<div class="sd-bar"><button class="link" id="sermonBack">&#8592; Biblioteca</button><span class="sd-status" id="sd-status">' + (isNew ? "Novo sermão" : "Salvo") + '</span><span style="flex:1"></span><button class="btn ghost sm" id="sd-asst-toggle">Escrituras</button><button class="btn ghost sm" id="sd-props-open">Propriedades</button></div>';

  return '<div class="sd-editor">' + bar + '<div class="sd-body" id="sd-body-el">' + rail + canvas + asst + '</div>' + drawer + '</div>';
}

// Workspace da série: visão/tema, escrituras-chave (derivadas das passagens reais
// dos sermões), datas, e o cronograma dos sermões da série. Vazio honesto.
function seriesWorkspace(id) {
  var se = seriesById(id);
  if (!se) return '<button class="link" id="seriesBack">&#8592; Voltar à biblioteca</button><div class="empty">Série não encontrada.</div>';
  var all = state.sermons || [];
  var mine = all.filter(function (x) { return x.series_id === id; }).slice().sort(function (a, b) {
    if (!a.sermon_date && !b.sermon_date) return 0;
    if (!a.sermon_date) return 1; if (!b.sermon_date) return -1;
    return a.sermon_date < b.sermon_date ? -1 : (a.sermon_date > b.sermon_date ? 1 : 0);
  });

  // Escrituras-chave: as passagens que os sermões desta série realmente abordam.
  var seen = {}, keyScr = [];
  mine.forEach(function (s) { var p = (s.main_passage || "").trim(); if (p && !seen[p]) { seen[p] = 1; keyScr.push(p); } });
  var keyScrHtml = keyScr.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + keyScr.map(function (p) { return '<span class="chip" style="background:rgba(43,92,230,.10);color:var(--blue)">' + esc(p) + '</span>'; }).join("") + '</div>' : '<div class="muted">As escrituras-chave aparecem conforme você define a passagem de cada sermão.</div>';

  var period = (se.start_date || se.end_date) ? (brDate(se.start_date) || '…') + ' — ' + (brDate(se.end_date) || '…') : 'sem período definido';

  var schedule = mine.map(function (s) {
    return '<button class="li" data-sermon="' + s.id + '" style="width:100%;text-align:left;background:none;border:0;cursor:pointer"><div class="av">' + (s.sermon_date ? brDate(s.sermon_date).slice(0, 5) : '—') + '</div><div style="flex:1"><div><b>' + esc(s.title || "(sem título)") + '</b></div>' + (s.main_passage ? '<div class="meta">' + esc(s.main_passage) + '</div>' : '') + '</div><div class="right"><span class="hb ' + (STATUS_BAND[s.status] || "attention") + '">' + (STATUS_LBL[s.status] || s.status) + '</span> <span class="link" data-series-remove="' + s.id + '">remover</span></div></button>';
  }).join("") || '<div class="empty">Sem sermões ainda. Vincule um sermão a esta série abaixo — ou defina a série no editor do sermão.</div>';

  var addable = all.filter(function (s) { return s.series_id !== id; });
  var addCtl = addable.length ? '<div class="mrow" style="margin-top:12px"><div class="field"><label>Adicionar sermão à série</label><select id="series-add-sel">' + addable.map(function (s) { return '<option value="' + s.id + '">' + esc(s.title || "(sem título)") + '</option>'; }).join("") + '</select></div><div class="field" style="display:flex;align-items:flex-end"><button class="btn ghost" id="series-add-btn" data-series="' + id + '">Adicionar</button></div></div>' : '<div class="muted" style="margin-top:12px">Todos os sermões já estão nesta série. Crie um novo em Estudo.</div>';

  return '<button class="link" id="seriesBack">&#8592; Voltar à biblioteca</button>' +
    '<div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">' + esc(se.title || "(sem título)") + '</h1><p class="sub" style="margin:0">' + (se.theme ? esc(se.theme) : 'Série de ensino') + '</p></div><button class="btn ghost" id="editSeries" data-series="' + id + '" style="margin-left:auto">Editar série</button></div>' +
    '<div class="row2"><div class="panel"><div class="ph"><h3>Visão</h3><span class="hb ' + (SERIES_BAND[se.status] || "attention") + '" style="margin-left:auto">' + (SERIES_LBL[se.status] || se.status) + '</span></div>' +
    (se.description ? '<p style="margin:0 0 12px">' + esc(se.description) + '</p>' : '<p class="muted" style="margin:0 0 12px">Sem descrição da visão ainda.</p>') +
    '<div class="field"><label>Período</label><div>' + period + '</div></div>' +
    '<div class="field"><label>Escrituras-chave</label>' + keyScrHtml + '</div>' +
    '</div><div class="panel"><div class="ph"><h3>Cronograma</h3><span class="muted" style="margin-left:auto">' + mine.length + ' sermã' + (mine.length === 1 ? 'o' : 'os') + '</span></div>' +
    schedule + addCtl + '</div></div>';
}

function seriesModal(se) {
  var isNew = !se; se = se || {};
  openModal('<h3>' + (isNew ? 'Nova série' : 'Editar série') + '</h3>' +
    '<div class="field"><label>Título</label><input id="sx-title" value="' + esc(se.title || "") + '" placeholder="Ex.: O Bom Pastor"></div>' +
    '<div class="field"><label>Visão / descrição</label><textarea id="sx-desc" rows="3" placeholder="Para onde esta série leva a igreja">' + esc(se.description || "") + '</textarea></div>' +
    '<div class="field"><label>Tema</label><input id="sx-theme" value="' + esc(se.theme || "") + '" placeholder="Ex.: Identidade em Cristo"></div>' +
    '<div class="mrow"><div class="field"><label>Início</label><input id="sx-start" type="date" value="' + esc(se.start_date || "") + '"></div><div class="field"><label>Fim</label><input id="sx-end" type="date" value="' + esc(se.end_date || "") + '"></div></div>' +
    '<div class="field"><label>Status</label><select id="sx-status">' + opts(SERIES_LBL, se.status || "planning") + '</select></div>' +
    '<div class="actions"><button class="btn ghost" id="sx-cancel">Cancelar</button><button class="btn" id="sx-save" data-id="' + (se.id || "") + '">' + (isNew ? 'Criar série' : 'Salvar') + '</button></div>');
  document.getElementById("sx-cancel").onclick = closeModal;
  document.getElementById("sx-save").onclick = function () {
    var title = val("sx-title").trim(); if (!title) { var el = document.getElementById("sx-title"); if (el) el.focus(); return; }
    var data = { title: title, description: val("sx-desc").trim(), theme: val("sx-theme").trim(), start_date: val("sx-start") || null, end_date: val("sx-end") || null, status: val("sx-status") };
    var id = this.getAttribute("data-id");
    if (id) { updateSeries(id, data).then(function () { closeModal(); render(); }); }
    else { createSeries(data).then(function (nid) { closeModal(); if (nid) state.seriesDetail = nid; save(); render(); }); }
  };
}

// Autosave do canvas: digitar cresce a textarea e agenda o salvamento (sem re-render).
document.addEventListener("input", function (e) {
  var t = e.target; if (!t || !t.id || !state.sermonEdit) return;
  if (t.id.indexOf("se-") !== 0) return;
  if (t.classList && t.classList.contains("sd-doc")) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }
  scheduleSave();
});

document.addEventListener("change", function (e) {
  var t = e.target;
  if (t && t.id === "sermon-fcampus") { state.sermonFilter = Object.assign({}, state.sermonFilter, { campus: t.value || null }); save(); render(); return; }
  if (t && t.id === "sermon-fseries") { state.sermonFilter = Object.assign({}, state.sermonFilter, { series: t.value || null }); save(); render(); return; }
  // Toggle de reconhecimento de escritura (visão do dono: desligável).
  if (t && t.id === "sd-recog") { state.scriptureOn = t.checked; save(); refreshDetected(); scheduleSave(); return; }
  // Propriedades (status/visibilidade/campus/série/data) → autosave.
  if (t && t.id && t.id.indexOf("se-") === 0 && state.sermonEdit) { scheduleSave(); return; }
});

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target.closest("[data-sermon],[data-sermonstatus],[data-seriesdetail],[data-series-remove],[data-goto],[data-refi],[data-mapbook],#newSermon,#sermonBack,#sd-props-open,#sd-props-close,#sd-drawer-ov,#sd-asst-toggle,#openMap,#mapBack,#newSeries,#seriesBack,#editSeries,#series-add-btn") : null; if (!t) return;
  if (t.getAttribute("data-series-remove")) { e.stopPropagation(); setSermonSeries(t.getAttribute("data-series-remove"), null).then(function () { render(); }); return; }
  if (t.getAttribute("data-goto")) { var el = gid(t.getAttribute("data-goto")); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (t.getAttribute("data-refi")) { var ri = parseInt(t.getAttribute("data-refi"), 10); if (detectedRefs[ri]) openScripturePanel(detectedRefs[ri]); return; }
  if (t.getAttribute("data-mapbook")) { var mb = t.getAttribute("data-mapbook"); state.scriptureMapBook = state.scriptureMapBook === mb ? null : mb; save(); render(); return; }
  if (t.id === "sd-asst-toggle") { toggleAssistant(); return; }
  if (t.id === "openMap") { state.scriptureMap = true; state.scriptureMapBook = null; save(); render(); return; }
  if (t.id === "mapBack") { state.scriptureMap = false; state.scriptureMapBook = null; save(); render(); return; }
  if (t.id === "sd-props-open") { showDrawer(true); return; }
  if (t.id === "sd-props-close" || t.id === "sd-drawer-ov") { showDrawer(false); return; }
  if (t.getAttribute("data-sermonstatus")) { var v = t.getAttribute("data-sermonstatus"); state.sermonFilter = Object.assign({}, state.sermonFilter, { status: v === "__all__" ? null : v }); save(); render(); return; }
  if (t.id === "newSermon") { state.sermonEdit = "__new__"; save(); render(); return; }
  if (t.id === "newSeries") { seriesModal(null); return; }
  if (t.id === "editSeries") { seriesModal(seriesById(t.getAttribute("data-series"))); return; }
  if (t.id === "series-add-btn") { var sel = document.getElementById("series-add-sel"); if (!sel || !sel.value) return; setSermonSeries(sel.value, t.getAttribute("data-series")).then(function () { render(); }); return; }
  if (t.getAttribute("data-seriesdetail")) { state.seriesDetail = t.getAttribute("data-seriesdetail"); save(); render(); return; }
  if (t.getAttribute("data-sermon")) { state.sermonEdit = t.getAttribute("data-sermon"); save(); render(); return; }
  if (t.id === "sermonBack") { flushSave(); state.sermonEdit = null; editingId = null; save(); render(); return; }
  if (t.id === "seriesBack") { state.seriesDetail = null; save(); render(); return; }
});
