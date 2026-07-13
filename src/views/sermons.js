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
import { createNote, updateNote, deleteNote } from "../core/notes-repo.js";
import { createResource, updateResource, deleteResource } from "../core/resources-repo.js";
import { syncSermonScriptures } from "../core/scriptures-repo.js";
import { parseRefs } from "../core/scripture-parse.js";
import { fetchPassage, listTranslations } from "../core/bible-source.js";
import { BOOKS, bookName } from "../core/bible-books.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

var STATUS_LBL = { draft: "Rascunho", preparing: "Preparando", ready: "Pronto", preached: "Pregado", archived: "Arquivado" };
var VIS_LBL = { private: "Privado", leadership: "Liderança", church: "Igreja", public: "Público" };
var STATUS_BAND = { draft: "attention", preparing: "attention", ready: "healthy", preached: "healthy", archived: "risk" };
var SERIES_LBL = { planning: "Planejando", active: "Ativa", completed: "Concluída", archived: "Arquivada" };
var SERIES_BAND = { planning: "attention", active: "healthy", completed: "healthy", archived: "risk" };
var NOTE_SCOPE_LBL = { personal: "Pessoal", shared: "Compartilhada" };
var RES_TYPE_LBL = { book: "Livro", article: "Artigo", pdf: "PDF", link: "Link", video: "Vídeo", quote: "Citação", doc: "Documento", other: "Outro" };

var SECTIONS = [
  { key: "outline", id: "se-outline", label: "Esboço", ph: "Introdução, pontos, sub-pontos…" },
  { key: "notes", id: "se-notes", label: "Notas", ph: "Texto livre de estudo" },
  { key: "illustrations", id: "se-illus", label: "Ilustrações", ph: "Histórias, exemplos, imagens" },
  { key: "application", id: "se-appl", label: "Aplicação", ph: "Como isso toca a vida da igreja" },
  { key: "prayer_response", id: "se-prayer", label: "Resposta de oração", ph: "Como responder a Deus a partir deste texto" },
];
// O corpo aberto do canvas é a escrita livre (content.notes). As demais seções são
// ESTRUTURA OPCIONAL: só aparecem se já têm conteúdo ou quando o pastor as adiciona.
var BODY = { key: "notes", id: "se-notes" };
var OPTIONAL = SECTIONS.filter(function (s) { return s.key !== "notes"; });
function sectionMeta(key) { return SECTIONS.filter(function (s) { return s.key === key; })[0]; }

function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function gid(id) { return document.getElementById(id); }
function blankSermon() { return { id: null, title: "", subtitle: "", main_passage: "", big_idea: "", status: "draft", visibility: "church", campus: state.activeCampus, sermon_date: "", series_id: null, content: {} }; }
function brDate(d) { return d ? d.split("-").reverse().join("/") : ""; }
function seriesById(id) { return (state.series || []).find(function (x) { return x.id === id; }) || null; }
function sermonById(id) { return (state.sermons || []).find(function (x) { return x.id === id; }) || null; }
function noteById(id) { return (state.notes || []).find(function (x) { return x.id === id; }) || null; }
function parseTags(s) { return (s || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean); }

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
// Bloco de seção opcional (cabeçalho discreto + textarea aberta). Removível.
function sectionBlockHtml(sec, value) {
  return '<section class="sd-block" id="sec-' + sec.key + '"><div class="sd-sech"><span class="sd-seclabel">' + sec.label + '</span><button class="link sd-secdel" data-secdel="' + sec.key + '">remover</button></div>' +
    '<textarea id="' + sec.id + '" class="sd-doc" placeholder="' + sec.ph + '">' + esc(value || "") + '</textarea></section>';
}
// Menu "+ Seção": só oferece as seções que ainda não estão no canvas.
function refreshAddMenu() {
  var box = gid("sd-addsec"); if (!box) return;
  var avail = OPTIONAL.filter(function (sec) { return !gid("sec-" + sec.key); });
  box.innerHTML = avail.map(function (sec) { return '<button class="sd-addbtn" data-addsec="' + sec.key + '">+ ' + sec.label + '</button>'; }).join("");
}
function addSection(key) {
  var sec = sectionMeta(key); if (!sec) return;
  var ex = gid(sec.id); if (ex) { ex.focus(); return; }
  var host = gid("sd-sections"); if (!host) return;
  host.insertAdjacentHTML("beforeend", sectionBlockHtml(sec, ""));
  var ta = gid(sec.id); if (ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; ta.focus(); }
  refreshAddMenu();
}
function removeSection(key) {
  var sec = sectionMeta(key); if (!sec) return;
  // Seção com conteúdo: confirma (não há desfazer). Vazia: remove na hora.
  if (val(sec.id).trim() && !window.confirm("Remover esta seção e o conteúdo dela?")) return;
  var el = gid("sec-" + key); if (el && el.parentNode) el.parentNode.removeChild(el);
  refreshAddMenu(); scheduleSave();
}
var focusNew = false;
// Montagem do editor (via render.js): dimensiona as textareas, popula o menu de
// seções e, num sermão novo, põe o cursor no título (sensação Notion).
export function mountSermonEditor() {
  sizeSermonDocs(); refreshAddMenu();
  if (focusNew) { var t = gid("se-title"); if (t) t.focus(); focusNew = false; }
}
function showDrawer(open) { var d = gid("sd-drawer"), o = gid("sd-drawer-ov"); if (d) d.style.display = open ? "block" : "none"; if (o) o.style.display = open ? "block" : "none"; }

// ——— Zona direita: assistente de estudo (painel de escritura da Fase 3) ———
var detectedRefs = [];
var panelRef = null;
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
var panelWhole = false;
function openScripturePanel(ref) {
  var box = gid("sd-panel"); if (!box || !ref) return;
  panelRef = ref; panelWhole = false;
  var hist = sermonsUsing(ref);
  var histHtml = hist.length ? '<div class="sd-h" style="margin-top:16px">Você já pregou sobre isto</div>' + hist.map(function (s) { return '<button class="li" data-sermon="' + s.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer;padding:8px 0"><div style="flex:1"><b>' + esc(s.title || "(sem título)") + '</b>' + (s.sermon_date ? ' <span class="muted">· ' + brDate(s.sermon_date) + '</span>' : '') + '</div></button>'; }).join("") : '<div class="muted" style="margin-top:14px">Primeira vez que a igreja aborda esta passagem por aqui.</div>';
  box.innerHTML = '<div class="ph" style="margin-bottom:6px;gap:8px"><div class="sd-h" style="margin:0">' + esc(ref.reference) + '</div><button class="link" id="sd-readchap" style="margin-left:auto">Capítulo inteiro</button><button class="link" id="sd-compare">Comparar</button></div><div class="muted" id="sd-passage-text">Carregando o texto…</div>' + histHtml;
  renderPanelText();
}
// Carrega o texto no painel: só o(s) versículo(s), ou o capítulo inteiro (destacando
// a passagem). Estado de erro honesto quando a rede/versão falha.
function renderPanelText() {
  var t = gid("sd-passage-text"); if (!t || !panelRef) return;
  t.className = "muted"; t.style.maxHeight = ""; t.style.overflow = ""; t.textContent = "Carregando o texto…";
  var q = panelWhole ? { book: panelRef.book, chapter: panelRef.chapter, verse_start: null, verse_end: null } : panelRef;
  fetchPassage(q).then(function (res) {
    var el = gid("sd-passage-text"); if (!el) return;
    if (res && res.ok) {
      el.className = ""; el.style.lineHeight = "1.7"; el.style.fontSize = "14px";
      var vs = panelRef.verse_start, ve = panelRef.verse_end || panelRef.verse_start;
      el.innerHTML = res.verses.map(function (v) {
        var seg = '<sup style="color:var(--text-2);margin-right:3px">' + v.n + '</sup>' + esc(v.text);
        return (panelWhole && vs && v.n >= vs && v.n <= ve) ? '<mark style="background:rgba(43,92,230,.16);color:inherit">' + seg + '</mark>' : seg;
      }).join(" ") + '<div class="muted" style="margin-top:8px">Versão: ' + esc(res.translationName || res.translationId || "") + '</div>';
      if (panelWhole) { el.style.display = "block"; el.style.maxHeight = "300px"; el.style.overflow = "auto"; }
    } else {
      el.textContent = (res && res.error) || "Não foi possível carregar a versão agora.";
    }
  });
}
function toggleAssistant(open) {
  var body = gid("sd-body-el"), z = gid("sd-asst");
  if (!body || !z) return;
  var show = open === undefined ? z.style.display === "none" : open;
  z.style.display = show ? "block" : "none";
  if (show) body.classList.add("asst"); else body.classList.remove("asst");
  if (show) { refreshDetected(); refreshRelated(); requestAnimationFrame(sizeSermonDocs); }
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

// ——— Comparação bíblica (Fase 3b): livro→cap→versículo, versões lado a lado ———
// Gate de licença: só exibimos versões que temos direito de mostrar. O catálogo da
// helloao é de uso livre/comercial (por isso foi escolhido) → todas passam. Este é o
// ponto único onde uma fonte licenciada futura (ESV/NIV) seria barrada sem direito.
function isDisplayable(tr) { return !!tr && !!tr.id; }
// Só as línguas do público do Tally, com a abreviação como se usa (não "por"/"eng").
var APP_LANGS = [{ app: "pt", code: "por", label: "PT-BR" }, { app: "en", code: "eng", label: "EN" }, { app: "es", code: "spa", label: "ES" }];
function appLangCode() { var a = (state.account && state.account.language) || "pt"; var m = APP_LANGS.filter(function (x) { return x.app === a; })[0]; return m ? m.code : "por"; }
var cmpState = { ref: null, lang: null, picks: [], results: {} };
var cmpTranslations = null;
function cmpVersionsForLang() { return (cmpTranslations || []).filter(function (t) { return (t.language || "").toLowerCase() === cmpState.lang; }); }
function cmpVerLabel(t) { return esc(t.name || t.shortName || t.id) + (t.shortName ? " (" + esc(t.shortName) + ")" : ""); }
function readPassageInputs() {
  var bk = val("cmp-book") || cmpState.ref.book;
  var ch = parseInt(val("cmp-chap"), 10); var vs = parseInt(val("cmp-vs"), 10); var ve = parseInt(val("cmp-ve"), 10);
  cmpState.ref = { book: bk, chapter: ch || cmpState.ref.chapter, verse_start: vs || null, verse_end: ve || null };
}
function cmpRefLabel() { var r = cmpState.ref; return bookName(r.book) + " " + r.chapter + (r.verse_start ? ":" + r.verse_start + (r.verse_end && r.verse_end !== r.verse_start ? "-" + r.verse_end : "") : ""); }

function renderCompare() {
  var r = cmpState.ref;
  var books = BOOKS.map(function (b) { return '<option value="' + b.code + '"' + (b.code === r.book ? " selected" : "") + '>' + esc(b.pt) + '</option>'; }).join("");
  var langSeg = APP_LANGS.map(function (l) { return '<button class="cmp-lang' + (cmpState.lang === l.code ? " on" : "") + '" data-cmplang="' + l.code + '">' + l.label + '</button>'; }).join("");
  var vers = cmpVersionsForLang();
  var verChips = cmpTranslations ? (vers.length ? vers.map(function (t) { var on = cmpState.picks.indexOf(t.id) >= 0; return '<label class="cmp-ver' + (on ? " on" : "") + '"><input type="checkbox" data-cmpver="' + t.id + '"' + (on ? " checked" : "") + '> ' + cmpVerLabel(t) + '</label>'; }).join("") : '<span class="muted">Sem versões de domínio público nesta língua.</span>') : '<span class="muted">Carregando versões…</span>';

  var cols = cmpState.picks.length ? '<div class="cmp-cols" style="grid-template-columns:repeat(' + Math.min(cmpState.picks.length, 3) + ',1fr)">' + cmpState.picks.map(function (id) {
    var tr = (cmpTranslations || []).find(function (t) { return t.id === id; }) || { id: id, shortName: id };
    var res = cmpState.results[id];
    var inner;
    if (!res || res.status === "loading") inner = '<div class="muted">Carregando…</div>';
    else if (res.status === "error") inner = '<div class="muted">' + esc(res.error || "Não foi possível carregar.") + '</div>';
    else inner = '<div class="cmp-text">' + res.verses.map(function (v) { return '<sup style="color:var(--text-2);margin-right:3px">' + v.n + '</sup>' + esc(v.text); }).join(" ") + '</div><div class="cmp-actions"><button class="link" data-cmpcopy="' + id + '">Copiar</button>' + (state.sermonEdit ? '<button class="link" data-cmpadd="' + id + '">Adicionar ao sermão</button>' : "") + '</div>';
    return '<div class="cmp-col"><div class="cmp-colh">' + cmpVerLabel(tr) + '</div>' + inner + '</div>';
  }).join("") + '</div>' : '<div class="empty">Escolha ao menos uma versão e clique em Comparar.</div>';

  var html = '<div class="ph"><h3>Comparar Bíblia</h3><button class="link" id="cmp-close" style="margin-left:auto">Fechar</button></div>' +
    '<div class="msub">Versões de domínio público. Passagem: <b>' + esc(cmpRefLabel()) + '</b></div>' +
    '<div class="cmp-sel"><select id="cmp-book">' + books + '</select>' +
    '<input id="cmp-chap" type="number" min="1" placeholder="cap" value="' + (r.chapter || "") + '" style="width:64px">' +
    '<input id="cmp-vs" type="number" min="1" placeholder="v. ini" value="' + (r.verse_start || "") + '" style="width:64px">' +
    '<input id="cmp-ve" type="number" min="1" placeholder="v. fim" value="' + (r.verse_end || "") + '" style="width:64px">' +
    '<button class="btn" id="cmp-go">Comparar</button>' +
    '<button class="link" id="cmp-wholechap">Capítulo inteiro</button>' +
    '<span style="flex:1"></span><span class="cmp-langseg">' + langSeg + '</span></div>' +
    '<div class="cmp-vers">' + verChips + '</div>' + cols;

  openModal(html);
  var m = document.querySelector("#ov .modal"); if (m) m.classList.add("cmp");
}
function runCompare() {
  readPassageInputs();
  cmpState.picks.forEach(function (id) { cmpState.results[id] = { status: "loading" }; });
  renderCompare();
  cmpState.picks.forEach(function (id) {
    fetchPassage(cmpState.ref, id).then(function (res) {
      cmpState.results[id] = res && res.ok ? { status: "ok", verses: res.verses } : { status: "error", error: res && res.error };
      renderCompare();
    });
  });
}
function openCompare(ref) {
  cmpState.ref = ref ? { book: ref.book, chapter: ref.chapter, verse_start: ref.verse_start, verse_end: ref.verse_end } : { book: "JHN", chapter: 3, verse_start: 16, verse_end: null };
  cmpState.lang = appLangCode();  // idioma do usuário; PT-BR vê só português, etc.
  cmpState.picks = []; cmpState.results = {};
  renderCompare();
  listTranslations().then(function (list) {
    cmpTranslations = (list || []).filter(isDisplayable);
    cmpState.picks = cmpVersionsForLang().slice(0, 2).map(function (t) { return t.id; });
    runCompare();
  }).catch(function () { cmpTranslations = []; renderCompare(); });
}
function cmpAddToSermon(id) {
  var res = cmpState.results[id]; if (!res || res.status !== "ok") return;
  var tr = (cmpTranslations || []).find(function (t) { return t.id === id; }) || { shortName: id };
  var text = res.verses.map(function (v) { return v.n + " " + v.text; }).join(" ");
  var note = gid("se-notes"); if (!note) return;
  var block = cmpRefLabel() + " (" + (tr.shortName || id) + ")\n" + text;
  note.value = (note.value ? note.value.replace(/\s+$/, "") + "\n\n" : "") + block;
  note.style.height = "auto"; note.style.height = note.scrollHeight + "px";
  scheduleSave();
  closeModal();
}

// Sub-nav do Estudo: Biblioteca (sermões+séries) · Notas · Recursos. As telas
// profundas (editor, workspace de série, mapa) não mostram o chrome — têm seu
// próprio voltar. Cada aba traz seu botão de ação à direita do título.
function studyChrome(tab) {
  var actions = tab === "notes"
    ? '<button class="btn" id="newNote" style="margin-left:auto">+ Nova nota</button>'
    : tab === "resources"
      ? '<button class="btn" id="newResource" style="margin-left:auto">+ Novo recurso</button>'
      : tab === "search"
        ? ''
        : '<button class="btn ghost" id="openMap" style="margin-left:auto">Mapa de Escrituras</button><button class="btn" id="newSermon">+ Novo sermão</button>';
  var tabs = [["library", "Biblioteca"], ["notes", "Notas"], ["resources", "Recursos"], ["search", "Buscar"]]
    .map(function (t) { return '<button class="fchip' + (tab === t[0] ? " on" : "") + '" data-studytab="' + t[0] + '">' + t[1] + '</button>'; }).join("");
  return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px"><div><h1 class="page">Estudo</h1><p class="sub" style="margin:0">Onde a igreja prepara e preserva o ensino. A Bíblia é a fundação; o Tally organiza.</p></div>' + actions + '</div>' +
    '<div class="filtchips" style="margin-bottom:16px">' + tabs + '</div>';
}

export function viewSermons() {
  if (state.seriesDetail) return seriesWorkspace(state.seriesDetail);
  if (state.sermonEdit) return sermonEditor(state.sermonEdit);
  if (state.scriptureMap) return scriptureMapView();
  var tab = state.studyTab || "library";
  if (tab === "notes") return studyChrome("notes") + notesBody();
  if (tab === "resources") return studyChrome("resources") + resourcesBody();
  if (tab === "search") return studyChrome("search") + searchBody();
  return studyChrome("library") + libraryBody();
}

function libraryBody() {
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

  return seriesBlock +
    '<div class="ph" style="margin-bottom:14px">' + statusChips + campusSel + seriesFilt + '</div>' +
    cardsHtml;
}

// ——— Notas (Fase 4): lista + editor em modal. Vínculos leves (sermão/série/
// escritura/tópico) — a nota não é ilha. Escopo pessoal/compartilhada. Vazio honesto.
function noteLinks(n) {
  var bits = [];
  var sm = n.sermon_id ? sermonById(n.sermon_id) : null; if (sm) bits.push("Sermão: " + esc(sm.title || "(sem título)"));
  var se = n.series_id ? seriesById(n.series_id) : null; if (se) bits.push("Série: " + esc(se.title || "(sem título)"));
  if (n.scripture_ref) bits.push(esc(n.scripture_ref));
  if (n.topic) bits.push(esc(n.topic));
  return bits.length ? '<div class="meta" style="margin-top:6px">' + bits.join(" · ") + '</div>' : "";
}
function tagsHtml(tags) {
  return (tags && tags.length) ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + tags.map(function (t) { return '<span class="chip" style="background:var(--surface-2)">' + esc(t) + '</span>'; }).join("") + '</div>' : "";
}
function notesBody() {
  var notes = state.notes || [];
  if (!notes.length) return '<div class="empty">Nenhuma nota ainda. Guarde uma ideia, um estudo ou uma observação em “+ Nova nota”.</div>';
  var cards = notes.map(function (n) {
    var preview = (n.content || "").trim();
    if (preview.length > 220) preview = preview.slice(0, 220) + "…";
    return '<button class="gcard" data-noteedit="' + n.id + '" style="text-align:left"><div class="gc-top"><span class="gc-name">' + esc(n.title || "(sem título)") + '</span><span class="hb ' + (n.scope === "shared" ? "healthy" : "attention") + '">' + (NOTE_SCOPE_LBL[n.scope] || "Pessoal") + '</span></div>' +
      (preview ? '<div class="gc-foot" style="white-space:pre-wrap">' + esc(preview) + '</div>' : '') + noteLinks(n) + tagsHtml(n.tags) + '</button>';
  }).join("");
  return '<div class="gcards">' + cards + '</div>';
}

// ——— Recursos (Fase 4): acervo de apoio ao ensino. Filtro por tipo/tópico.
function resourcesBody() {
  var all = state.resources || [];
  var f = state.resourceFilter || {};
  var list = all.filter(function (r) {
    return (!f.type || r.type === f.type) && (!f.topic || (r.topic || "") === f.topic);
  });
  var topics = []; all.forEach(function (r) { if (r.topic && topics.indexOf(r.topic) < 0) topics.push(r.topic); });
  var typeChips = '<div class="filtchips"><button class="fchip' + (!f.type ? " on" : "") + '" data-restype="__all__">Todos</button>' +
    Object.keys(RES_TYPE_LBL).map(function (ty) { return '<button class="fchip' + (f.type === ty ? " on" : "") + '" data-restype="' + ty + '">' + RES_TYPE_LBL[ty] + '</button>'; }).join("") + '</div>';
  var topicSel = topics.length ? '<select id="res-ftopic" style="margin-left:auto"><option value="">Todos os tópicos</option>' +
    topics.map(function (tp) { return '<option value="' + esc(tp) + '"' + (f.topic === tp ? " selected" : "") + '>' + esc(tp) + '</option>'; }).join("") + '</select>' : '';
  var filters = '<div class="ph" style="margin-bottom:14px">' + typeChips + topicSel + '</div>';

  if (!all.length) return filters + '<div class="empty">Nenhum recurso ainda. Adicione livros, artigos, links ou citações em “+ Novo recurso”.</div>';
  if (!list.length) return filters + '<div class="empty">Nenhum recurso com esse filtro.</div>';

  var cards = list.map(function (r) {
    var sm = r.sermon_id ? sermonById(r.sermon_id) : null;
    var meta = [];
    if (r.author) meta.push(esc(r.author));
    if (r.topic) meta.push(esc(r.topic));
    if (sm) meta.push("Sermão: " + esc(sm.title || "(sem título)"));
    var link = r.url ? '<div style="margin-top:6px"><a href="' + esc(r.url) + '" target="_blank" rel="noopener" class="link" data-noedit="1">Abrir link</a></div>' : '';
    return '<button class="gcard" data-resedit="' + r.id + '" style="text-align:left"><div class="gc-top"><span class="gc-name">' + esc(r.title || "(sem título)") + '</span><span class="hb attention">' + (RES_TYPE_LBL[r.type] || "Outro") + '</span></div>' +
      (meta.length ? '<div class="gc-sub">' + meta.join(" · ") + '</div>' : '') +
      (r.description ? '<div class="gc-foot">' + esc(r.description) + '</div>' : '') + link + tagsHtml(r.tags) + '</button>';
  }).join("");
  return filters + '<div class="gcards">' + cards + '</div>';
}

// Editor de nota (modal). Vínculos opcionais e escopo. Excluir quando já existe.
function noteModal(n) {
  var isNew = !n; n = n || { scope: "personal", tags: [] };
  var sermonOpts = '<option value="">Nenhum</option>' + (state.sermons || []).map(function (s) { return '<option value="' + s.id + '"' + (n.sermon_id === s.id ? " selected" : "") + '>' + esc(s.title || "(sem título)") + '</option>'; }).join("");
  var seriesOpts = '<option value="">Nenhuma</option>' + (state.series || []).map(function (s) { return '<option value="' + s.id + '"' + (n.series_id === s.id ? " selected" : "") + '>' + esc(s.title || "(sem título)") + '</option>'; }).join("");
  openModal('<h3>' + (isNew ? 'Nova nota' : 'Editar nota') + '</h3>' +
    '<div class="field"><label>Título</label><input id="nt-title" value="' + esc(n.title || "") + '" placeholder="Ex.: Reflexão sobre João 10"></div>' +
    '<div class="field"><label>Conteúdo</label><textarea id="nt-content" rows="6" placeholder="Escreva livremente…">' + esc(n.content || "") + '</textarea></div>' +
    '<div class="mrow"><div class="field"><label>Escopo</label><select id="nt-scope">' + opts(NOTE_SCOPE_LBL, n.scope || "personal") + '</select></div><div class="field"><label>Tópico</label><input id="nt-topic" value="' + esc(n.topic || "") + '" placeholder="Opcional"></div></div>' +
    '<div class="mrow"><div class="field"><label>Sermão</label><select id="nt-sermon">' + sermonOpts + '</select></div><div class="field"><label>Série</label><select id="nt-series">' + seriesOpts + '</select></div></div>' +
    '<div class="mrow"><div class="field"><label>Escritura</label><input id="nt-scripture" value="' + esc(n.scripture_ref || "") + '" placeholder="Ex.: João 10:1-18"></div><div class="field"><label>Tags (vírgula)</label><input id="nt-tags" value="' + esc((n.tags || []).join(", ")) + '" placeholder="graça, pastoreio"></div></div>' +
    '<div class="actions">' + (isNew ? '' : '<button class="btn ghost" id="nt-del" data-id="' + n.id + '" style="margin-right:auto;color:var(--danger,#c0392b)">Excluir</button>') + '<button class="btn ghost" id="nt-cancel">Cancelar</button><button class="btn" id="nt-save" data-id="' + (n.id || "") + '">' + (isNew ? 'Criar nota' : 'Salvar') + '</button></div>');
  document.getElementById("nt-cancel").onclick = closeModal;
  var del = document.getElementById("nt-del");
  if (del) del.onclick = function () { if (!window.confirm("Excluir esta nota?")) return; deleteNote(this.getAttribute("data-id")).then(function () { closeModal(); render(); }); };
  document.getElementById("nt-save").onclick = function () {
    var title = val("nt-title").trim();
    if (!title && !val("nt-content").trim()) { var el = document.getElementById("nt-title"); if (el) el.focus(); return; }
    var data = { title: title, content: val("nt-content").trim(), scope: val("nt-scope"), topic: val("nt-topic").trim(), sermon_id: val("nt-sermon") || null, series_id: val("nt-series") || null, scripture_ref: val("nt-scripture").trim(), tags: parseTags(val("nt-tags")) };
    var id = this.getAttribute("data-id");
    if (id) { updateNote(id, data).then(function () { closeModal(); render(); }); }
    else { createNote(data).then(function () { closeModal(); render(); }); }
  };
}

// Editor de recurso (modal). Tipo, autor, url, descrição, tópico, tags, sermão.
function resourceModal(r) {
  var isNew = !r; r = r || { type: "book", tags: [] };
  var sermonOpts = '<option value="">Nenhum</option>' + (state.sermons || []).map(function (s) { return '<option value="' + s.id + '"' + (r.sermon_id === s.id ? " selected" : "") + '>' + esc(s.title || "(sem título)") + '</option>'; }).join("");
  openModal('<h3>' + (isNew ? 'Novo recurso' : 'Editar recurso') + '</h3>' +
    '<div class="field"><label>Título</label><input id="rs-title" value="' + esc(r.title || "") + '" placeholder="Ex.: O Conhecimento do Santo"></div>' +
    '<div class="mrow"><div class="field"><label>Autor</label><input id="rs-author" value="' + esc(r.author || "") + '" placeholder="Opcional"></div><div class="field"><label>Tipo</label><select id="rs-type">' + opts(RES_TYPE_LBL, r.type || "book") + '</select></div></div>' +
    '<div class="field"><label>URL</label><input id="rs-url" value="' + esc(r.url || "") + '" placeholder="https://… (opcional)"></div>' +
    '<div class="field"><label>Descrição</label><textarea id="rs-desc" rows="3" placeholder="Por que importa / do que trata">' + esc(r.description || "") + '</textarea></div>' +
    '<div class="mrow"><div class="field"><label>Tópico</label><input id="rs-topic" value="' + esc(r.topic || "") + '" placeholder="Opcional"></div><div class="field"><label>Tags (vírgula)</label><input id="rs-tags" value="' + esc((r.tags || []).join(", ")) + '" placeholder="graça, teologia"></div></div>' +
    '<div class="field"><label>Sermão relacionado</label><select id="rs-sermon">' + sermonOpts + '</select></div>' +
    '<div class="actions">' + (isNew ? '' : '<button class="btn ghost" id="rs-del" data-id="' + r.id + '" style="margin-right:auto;color:var(--danger,#c0392b)">Excluir</button>') + '<button class="btn ghost" id="rs-cancel">Cancelar</button><button class="btn" id="rs-save" data-id="' + (r.id || "") + '">' + (isNew ? 'Adicionar' : 'Salvar') + '</button></div>');
  document.getElementById("rs-cancel").onclick = closeModal;
  var del = document.getElementById("rs-del");
  if (del) del.onclick = function () { if (!window.confirm("Excluir este recurso?")) return; deleteResource(this.getAttribute("data-id")).then(function () { closeModal(); render(); }); };
  document.getElementById("rs-save").onclick = function () {
    var title = val("rs-title").trim(); if (!title) { var el = document.getElementById("rs-title"); if (el) el.focus(); return; }
    var data = { title: title, author: val("rs-author").trim(), type: val("rs-type"), url: val("rs-url").trim(), description: val("rs-desc").trim(), topic: val("rs-topic").trim(), tags: parseTags(val("rs-tags")), sermon_id: val("rs-sermon") || null };
    var id = this.getAttribute("data-id");
    if (id) { updateResource(id, data).then(function () { closeModal(); render(); }); }
    else { createResource(data).then(function () { closeModal(); render(); }); }
  };
}

function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (sel === k ? " selected" : "") + '>' + map[k] + '</option>'; }).join(""); }

// ——— Busca do Estudo (Fase 5): textual/relevância no client. Sem embeddings —
// grátis e simples. Tokeniza a query e soma matches por campo (título pesa mais).
function norm(s) { return (s || "").toString().toLowerCase(); }
function tokens(q) { return norm(q).split(/\s+/).map(function (t) { return t.trim(); }).filter(function (t) { return t.length >= 2; }); }
function scoreText(text, toks, weight) { var t = norm(text), sc = 0; toks.forEach(function (tok) { if (t.indexOf(tok) >= 0) sc += weight; }); return sc; }
function sermonSearchText(s) { var c = s.content || {}; return [c.outline, c.notes, c.illustrations, c.application, c.prayer_response].filter(Boolean).join(" "); }
function studySearch(q) {
  var toks = tokens(q);
  var res = { sermons: [], notes: [], scriptures: [], series: [] };
  if (!toks.length) return res;
  (state.sermons || []).forEach(function (s) {
    var sc = scoreText(s.title, toks, 3) + scoreText(s.main_passage, toks, 2) + scoreText(s.big_idea, toks, 2) + scoreText(s.subtitle, toks, 1) + scoreText(sermonSearchText(s), toks, 1);
    if (sc > 0) res.sermons.push({ item: s, score: sc });
  });
  (state.notes || []).forEach(function (n) {
    var sc = scoreText(n.title, toks, 3) + scoreText(n.content, toks, 1) + scoreText(n.topic, toks, 2) + scoreText(n.scripture_ref, toks, 2) + scoreText((n.tags || []).join(" "), toks, 1);
    if (sc > 0) res.notes.push({ item: n, score: sc });
  });
  (state.scriptures || []).forEach(function (x) { var sc = scoreText(x.reference, toks, 3); if (sc > 0) res.scriptures.push({ item: x, score: sc }); });
  (state.series || []).forEach(function (se) {
    var sc = scoreText(se.title, toks, 3) + scoreText(se.theme, toks, 2) + scoreText(se.description, toks, 1);
    if (sc > 0) res.series.push({ item: se, score: sc });
  });
  ["sermons", "notes", "scriptures", "series"].forEach(function (k) { res[k].sort(function (a, b) { return b.score - a.score; }); });
  return res;
}
function searchGroup(label, n) { return '<div class="ph" style="margin:8px 0 4px"><h3 class="muted" style="margin:0;font-size:13px;font-weight:600">' + label + '</h3><span class="muted" style="margin-left:auto">' + n + '</span></div>'; }
function searchResultsHtml(q) {
  if (!q || !q.trim()) return '<div class="empty">Escreva para buscar em todo o Estudo — sermões, notas, referências bíblicas e séries.</div>';
  var r = studySearch(q);
  var total = r.sermons.length + r.notes.length + r.scriptures.length + r.series.length;
  if (!total) return '<div class="empty">Nada encontrado para “' + esc(q.trim()) + '”.</div>';
  var out = "";
  if (r.sermons.length) out += searchGroup("Sermões", r.sermons.length) + r.sermons.map(function (h) { var s = h.item; return '<button class="li" data-sermon="' + s.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>' + esc(s.title || "(sem título)") + '</b>' + (s.main_passage ? ' <span class="muted">· ' + esc(s.main_passage) + '</span>' : '') + (s.big_idea ? '<div class="meta">' + esc(s.big_idea) + '</div>' : '') + '</div></button>'; }).join("");
  if (r.notes.length) out += searchGroup("Notas", r.notes.length) + r.notes.map(function (h) { var n = h.item; return '<button class="li" data-noteedit="' + n.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>' + esc(n.title || "(sem título)") + '</b> <span class="hb ' + (n.scope === "shared" ? "healthy" : "attention") + '">' + (NOTE_SCOPE_LBL[n.scope] || "Pessoal") + '</span>' + (n.topic ? '<div class="meta">' + esc(n.topic) + '</div>' : '') + '</div></button>'; }).join("");
  if (r.scriptures.length) out += searchGroup("Referências", r.scriptures.length) + r.scriptures.map(function (h) { var x = h.item; var s = sermonById(x.sermon_id); return '<button class="li" data-sermon="' + x.sermon_id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>' + esc(x.reference) + '</b>' + (s ? ' <span class="muted">· ' + esc(s.title || "(sem título)") + '</span>' : '') + '</div></button>'; }).join("");
  if (r.series.length) out += searchGroup("Séries", r.series.length) + r.series.map(function (h) { var se = h.item; return '<button class="li" data-seriesdetail="' + se.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>' + esc(se.title || "(sem título)") + '</b>' + (se.theme ? ' <span class="muted">· ' + esc(se.theme) + '</span>' : '') + '</div></button>'; }).join("");
  return out;
}
function searchBody() {
  var q = state.studySearchQuery || "";
  return '<div class="ph" style="margin-bottom:14px"><input id="study-search" value="' + esc(q) + '" placeholder="Buscar em sermões, notas, referências e séries…" style="width:100%;max-width:520px" autocomplete="off"></div>' +
    '<div id="study-results">' + searchResultsHtml(q) + '</div>';
}

// ——— Memória de sermão (Fase 5): enquanto o pastor escreve, sugere sermões
// passados relacionados — por passagem (mesmo livro+capítulo) e por palavras-chave
// (título/ideia central/passagem). Toggle próprio (state.memoryOn), distinto do de
// reconhecimento de escritura. Só sugere; nunca decide.
function relatedSermons() {
  if (state.memoryOn === false) return [];
  var curId = editingId;
  var refs = refsForCurrent();
  var kw = tokens(val("se-title") + " " + val("se-bigidea") + " " + val("se-passage"));
  var scores = {};
  var chapKeys = {}; refs.forEach(function (r) { chapKeys[r.book + ":" + r.chapter] = 1; });
  (state.scriptures || []).forEach(function (x) { if (x.sermon_id === curId) return; if (chapKeys[x.book + ":" + x.chapter]) scores[x.sermon_id] = (scores[x.sermon_id] || 0) + 3; });
  if (kw.length) (state.sermons || []).forEach(function (s) {
    if (s.id === curId) return;
    var sc = scoreText(s.title, kw, 2) + scoreText(s.big_idea, kw, 1) + scoreText(s.main_passage, kw, 1);
    if (sc > 0) scores[s.id] = (scores[s.id] || 0) + sc;
  });
  var out = Object.keys(scores).map(function (id) { var s = sermonById(id); return s ? { s: s, score: scores[id] } : null; }).filter(Boolean);
  out.sort(function (a, b) { return b.score - a.score; });
  return out.slice(0, 5).map(function (x) { return x.s; });
}
export function refreshRelated() {
  var box = gid("sd-related"); if (!box) return;
  if (state.memoryOn === false) { box.innerHTML = '<div class="muted">Sugestão desligada.</div>'; return; }
  var rel = relatedSermons();
  if (!rel.length) { box.innerHTML = '<div class="muted">Nenhum sermão relacionado ainda. Conforme você escreve a passagem e a ideia central, sugestões aparecem.</div>'; return; }
  box.innerHTML = rel.map(function (s) { return '<button class="li" data-sermon="' + s.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer;padding:8px 0"><div style="flex:1"><b>' + esc(s.title || "(sem título)") + '</b>' + (s.sermon_date ? ' <span class="muted">· ' + brDate(s.sermon_date) + '</span>' : '') + (s.main_passage ? '<div class="meta">' + esc(s.main_passage) + '</div>' : '') + '</div></button>'; }).join("");
}

// Editor de sermão como CANVAS (spec §6-7, §24): título como H1 de documento,
// passagem + ideia central como subcabeçalho leve, seções como blocos no fluxo. Metadados
// recolhidos num drawer de Propriedades. Autosave discreto. A zona direita (assistente
// de estudo) nasce vazia aqui e recebe o painel de escritura na Fase 3.
function sermonEditor(id) {
  var isNew = id === "__new__";
  var s = isNew ? blankSermon() : ((state.sermons || []).find(function (x) { return x.id === id; }) || blankSermon());
  editingId = isNew ? null : s.id; creating = false; focusNew = isNew; clearTimeout(saveTimer);
  var c = s.content || {};

  // Só as seções opcionais COM conteúdo aparecem ao abrir; o resto vira "+ Seção".
  var present = OPTIONAL.filter(function (sec) { return (c[sec.key] || "").trim(); });
  var blocks = present.map(function (sec) { return sectionBlockHtml(sec, c[sec.key]); }).join("");
  var addBtns = OPTIONAL.filter(function (sec) { return !(c[sec.key] || "").trim(); })
    .map(function (sec) { return '<button class="sd-addbtn" data-addsec="' + sec.key + '">+ ' + sec.label + '</button>'; }).join("");

  var canvas = '<main class="sd-canvas">' +
    '<input id="se-title" class="sd-title" value="' + esc(s.title) + '" placeholder="Sem título">' +
    '<div class="sd-subhead">' +
    '<input id="se-passage" class="sd-passage" value="' + esc(s.main_passage) + '" placeholder="Passagem principal — ex.: João 10:1-18">' +
    '<input id="se-bigidea" class="sd-bigidea" value="' + esc(s.big_idea) + '" placeholder="Ideia central — a mensagem em uma frase">' +
    '</div>' +
    '<textarea id="se-notes" class="sd-doc sd-body-doc" placeholder="Comece a escrever…">' + esc(c.notes || "") + '</textarea>' +
    '<div id="sd-sections">' + blocks + '</div>' +
    '<div id="sd-addsec" class="sd-addsec">' + addBtns + '</div>' +
    '</main>';

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

  // Notas e recursos vinculados a este sermão (conexão leve — Fase 4). Só quando já salvo.
  var linkedNotes = isNew ? [] : (state.notes || []).filter(function (n) { return n.sermon_id === s.id; });
  var linkedRes = isNew ? [] : (state.resources || []).filter(function (r) { return r.sermon_id === s.id; });
  var linkedHtml = "";
  if (linkedNotes.length || linkedRes.length) {
    linkedHtml = '<div class="sd-h" style="margin-top:20px">Vinculados a este sermão</div>' +
      linkedNotes.map(function (n) { return '<button class="li" data-noteedit="' + n.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer;padding:7px 0"><div style="flex:1"><span class="muted" style="font-size:11px">Nota</span><div><b>' + esc(n.title || "(sem título)") + '</b></div></div></button>'; }).join("") +
      linkedRes.map(function (r) { return '<button class="li" data-resedit="' + r.id + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer;padding:7px 0"><div style="flex:1"><span class="muted" style="font-size:11px">' + (RES_TYPE_LBL[r.type] || "Recurso") + '</span><div><b>' + esc(r.title || "(sem título)") + '</b></div></div></button>'; }).join("");
  }

  // Zona direita — assistente de estudo (painel de escritura). Oculta por padrão.
  var asst = '<aside class="sd-asst" id="sd-asst" style="display:none">' +
    '<div class="ph" style="margin-bottom:10px"><h3 style="font-size:14px">Assistente de estudo</h3><button class="link" id="sd-compare-open" style="margin-left:auto">Comparar Bíblia</button></div>' +
    '<label class="sd-recog"><input type="checkbox" id="sd-recog"' + (state.scriptureOn === false ? "" : " checked") + '> Reconhecer escrituras</label>' +
    '<div class="sd-h" style="margin-top:16px">Referências</div>' +
    '<div id="sd-detected"></div>' +
    '<div id="sd-panel" style="margin-top:16px"></div>' +
    '<div class="sd-h" style="margin-top:20px">Memória de sermão</div>' +
    '<label class="sd-recog"><input type="checkbox" id="sd-memory"' + (state.memoryOn === false ? "" : " checked") + '> Sugerir sermões relacionados</label>' +
    '<div id="sd-related" style="margin-top:10px"></div>' +
    linkedHtml +
    '</aside>';

  var bar = '<div class="sd-bar"><button class="link" id="sermonBack">&#8592; Biblioteca</button><span class="sd-status" id="sd-status">' + (isNew ? "Novo sermão" : "Salvo") + '</span><span style="flex:1"></span><button class="btn ghost sm" id="sd-asst-toggle">Escrituras</button><button class="btn ghost sm" id="sd-props-open">Propriedades</button></div>';

  return '<div class="sd-editor">' + bar + '<div class="sd-body" id="sd-body-el">' + canvas + asst + '</div>' + drawer + '</div>';
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
  var t = e.target; if (!t || !t.id) return;
  // Busca do Estudo: atualiza só o container de resultados (preserva o foco/cursor).
  if (t.id === "study-search") { state.studySearchQuery = t.value; save(); var rb = gid("study-results"); if (rb) rb.innerHTML = searchResultsHtml(t.value); return; }
  if (!state.sermonEdit) return;
  if (t.id.indexOf("se-") !== 0) return;
  if (t.classList && t.classList.contains("sd-doc")) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }
  // Chips de referência ao vivo (a passagem sempre conta; seções, se o toggle estiver on).
  if (gid("sd-detected") && (t.id === "se-passage" || state.scriptureOn !== false)) refreshDetected();
  // Memória de sermão: título/ideia/passagem realimentam as sugestões.
  if (gid("sd-related") && (t.id === "se-title" || t.id === "se-bigidea" || t.id === "se-passage")) refreshRelated();
  scheduleSave();
});

document.addEventListener("change", function (e) {
  var t = e.target;
  if (t && t.id === "sermon-fcampus") { state.sermonFilter = Object.assign({}, state.sermonFilter, { campus: t.value || null }); save(); render(); return; }
  if (t && t.id === "sermon-fseries") { state.sermonFilter = Object.assign({}, state.sermonFilter, { series: t.value || null }); save(); render(); return; }
  if (t && t.id === "res-ftopic") { state.resourceFilter = Object.assign({}, state.resourceFilter, { topic: t.value || null }); save(); render(); return; }
  // Toggle de reconhecimento de escritura (visão do dono: desligável).
  if (t && t.id === "sd-recog") { state.scriptureOn = t.checked; save(); refreshDetected(); scheduleSave(); return; }
  // Toggle de memória de sermão (sugestão de relacionados — desligável).
  if (t && t.id === "sd-memory") { state.memoryOn = t.checked; save(); refreshRelated(); return; }
  // Comparação: livro/versões (a língua é botão, tratada no click).
  if (t && t.id === "cmp-book") { readPassageInputs(); renderCompare(); return; }
  if (t && t.getAttribute && t.getAttribute("data-cmpver")) { var vid = t.getAttribute("data-cmpver"); readPassageInputs(); var idx = cmpState.picks.indexOf(vid); if (idx >= 0) cmpState.picks.splice(idx, 1); else cmpState.picks.push(vid); renderCompare(); return; }
  // Propriedades (status/visibilidade/campus/série/data) → autosave.
  if (t && t.id && t.id.indexOf("se-") === 0 && state.sermonEdit) { scheduleSave(); return; }
});

document.addEventListener("click", function (e) {
  // Links dentro de cards (ex.: "Abrir link" de recurso) navegam normalmente.
  if (e.target.closest && e.target.closest("[data-noedit]")) return;
  var t = e.target.closest ? e.target.closest("[data-sermon],[data-sermonstatus],[data-seriesdetail],[data-series-remove],[data-refi],[data-mapbook],[data-cmpcopy],[data-cmpadd],[data-addsec],[data-secdel],[data-cmplang],[data-studytab],[data-noteedit],[data-resedit],[data-restype],#newSermon,#newNote,#newResource,#sermonBack,#sd-props-open,#sd-props-close,#sd-drawer-ov,#sd-asst-toggle,#sd-compare,#sd-compare-open,#sd-readchap,#cmp-close,#cmp-go,#cmp-wholechap,#openMap,#mapBack,#newSeries,#seriesBack,#editSeries,#series-add-btn") : null; if (!t) return;
  if (t.getAttribute("data-studytab")) { state.studyTab = t.getAttribute("data-studytab"); save(); render(); return; }
  if (t.getAttribute("data-noteedit")) { noteModal(noteById(t.getAttribute("data-noteedit"))); return; }
  if (t.getAttribute("data-resedit")) { resourceModal((state.resources || []).find(function (x) { return x.id === t.getAttribute("data-resedit"); })); return; }
  if (t.getAttribute("data-restype")) { var rt = t.getAttribute("data-restype"); state.resourceFilter = Object.assign({}, state.resourceFilter, { type: rt === "__all__" ? null : rt }); save(); render(); return; }
  if (t.id === "newNote") { noteModal(null); return; }
  if (t.id === "newResource") { resourceModal(null); return; }
  if (t.getAttribute("data-series-remove")) { e.stopPropagation(); setSermonSeries(t.getAttribute("data-series-remove"), null).then(function () { render(); }); return; }
  if (t.getAttribute("data-cmpcopy")) { var cc = cmpState.results[t.getAttribute("data-cmpcopy")]; if (cc && cc.status === "ok" && navigator.clipboard) navigator.clipboard.writeText(cmpRefLabel() + "\n" + cc.verses.map(function (v) { return v.n + " " + v.text; }).join(" ")); return; }
  if (t.getAttribute("data-cmpadd")) { cmpAddToSermon(t.getAttribute("data-cmpadd")); return; }
  if (t.getAttribute("data-addsec")) { addSection(t.getAttribute("data-addsec")); return; }
  if (t.getAttribute("data-secdel")) { removeSection(t.getAttribute("data-secdel")); return; }
  if (t.getAttribute("data-cmplang")) { readPassageInputs(); cmpState.lang = t.getAttribute("data-cmplang"); cmpState.picks = cmpVersionsForLang().slice(0, 2).map(function (x) { return x.id; }); cmpState.results = {}; renderCompare(); return; }
  if (t.getAttribute("data-refi")) { var ri = parseInt(t.getAttribute("data-refi"), 10); if (detectedRefs[ri]) openScripturePanel(detectedRefs[ri]); return; }
  if (t.getAttribute("data-mapbook")) { var mb = t.getAttribute("data-mapbook"); state.scriptureMapBook = state.scriptureMapBook === mb ? null : mb; save(); render(); return; }
  if (t.id === "sd-asst-toggle") { toggleAssistant(); return; }
  if (t.id === "sd-compare") { openCompare(panelRef); return; }
  if (t.id === "sd-compare-open") { openCompare(panelRef); return; }
  if (t.id === "sd-readchap") { panelWhole = !panelWhole; t.textContent = panelWhole ? "Só o versículo" : "Capítulo inteiro"; renderPanelText(); return; }
  if (t.id === "cmp-close") { closeModal(); return; }
  if (t.id === "cmp-go") { runCompare(); return; }
  if (t.id === "cmp-wholechap") { readPassageInputs(); var vsEl = gid("cmp-vs"), veEl = gid("cmp-ve"); if (vsEl) vsEl.value = ""; if (veEl) veEl.value = ""; runCompare(); return; }
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
