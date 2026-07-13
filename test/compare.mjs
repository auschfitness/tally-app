// Verificação de paridade: renderiza cada tela pelo MONÓLITO original e pelo
// código MODULAR, com os MESMOS dados (seed), e compara o HTML do #content.
// Também abre todos os modais no modular e confere que não quebram.
//
// Rodar: node test/compare.mjs   (a partir de tally-app/)

import { JSDOM } from "jsdom";
import fs from "node:fs";

const APP = "C:/Users/lucas/OneDrive/Desktop/Claude Files/TALLY/tally-app";

// --- monta um DOM com o corpo do app (sem executar o <script> do módulo) ---
const shell = fs.readFileSync(APP + "/index.html", "utf8");
const bodyInner = shell.substring(shell.indexOf("<body>") + 6, shell.indexOf('<script type="module"'));
const dom = new JSDOM("<!DOCTYPE html><html><head></head><body>" + bodyInner + "</body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;
// gráficos e layout da nuvem são de navegador — desligamos aqui (verificados no browser)
delete window.requestAnimationFrame;
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.HTMLElement = window.HTMLElement;
globalThis.requestAnimationFrame = undefined;
globalThis.getComputedStyle = window.getComputedStyle;

// POLÍTICA DE COBERTURA (Step 4 · Fase 2 em diante):
// Toda tela que GRADUA de "migração fiel" para "feature nova" sai da paridade
// byte a byte (ela passa a divergir do monólito de propósito) e ganha um SMOKE
// TEST de render em FEATURE_VIEWS (abaixo): renderiza com dados de exemplo,
// afirma que não lança e que contém os elementos-chave. As demais telas seguem
// na paridade normal até serem tocadas. Trocamos "idêntica ao original" por
// "renderiza certo e tem o que precisa ter" — o teste adequado pra uma tela que evolui.
// Graduadas até agora: journey (Journey Map), inbox (Group Signals), dashboard (Community Insights da Fase 6).
const VIEWS = ["people", "care", "groups", "coord", "prayer", "finance", "settings"];
const clone = (o) => JSON.parse(JSON.stringify(o));

// --- MONÓLITO: extrai o script inline do original e roda numa função ---
const mono = (() => {
  const orig = fs.readFileSync(APP + "/reference/original-monolith.html", "utf8");
  let script = orig.match(/<script>([\s\S]*?)<\/script>/)[1];
  script = script.replace("applyTheme();startApp();", ""); // não inicia (sem login/rede)
  const factory = new Function(
    "window", "document", "localStorage", "navigator",
    script + "\nreturn { seed:seed, render:render, setState:function(s){state=s;}, setView:function(v){state.view=v;} };"
  );
  return factory(window, window.document, window.localStorage, window.navigator);
})();

// mesma massa de dados para os dois lados (ids iguais)
const seedData = mono.seed();
const content = () => window.document.getElementById("content").innerHTML;

const monoHTML = {};
for (const v of VIEWS) { mono.setState(clone(seedData)); mono.setView(v); mono.render(); monoHTML[v] = content(); }

// --- MODULAR: importa os módulos e renderiza igual ---
const { setState } = await import("../src/core/state.js");
const { render } = await import("../src/core/render.js");

const splitHTML = {};
for (const v of VIEWS) { const s = clone(seedData); s.view = v; setState(s); render(); splitHTML[v] = content(); }

// --- compara ---
let ok = 0, fail = 0;
console.log("\n=== Paridade de render (monólito vs modular) ===");
for (const v of VIEWS) {
  if (monoHTML[v] === splitHTML[v]) { console.log("  ✓ " + v + "  (" + splitHTML[v].length + " chars)"); ok++; }
  else {
    fail++;
    let i = 0; while (i < monoHTML[v].length && monoHTML[v][i] === splitHTML[v][i]) i++;
    console.log("  ✗ " + v + "  DIFERE no char " + i);
    console.log("    mono : ..." + JSON.stringify(monoHTML[v].slice(Math.max(0, i - 40), i + 40)));
    console.log("    split: ..." + JSON.stringify(splitHTML[v].slice(Math.max(0, i - 40), i + 40)));
  }
}

// --- modais no modular (abre e confere que renderiza sem erro) ---
console.log("\n=== Modais (modular) ===");
setState(clone(seedData));
const sticks = await import("../src/views/sticks.js");
const finance = await import("../src/views/finance.js");
const coord = await import("../src/views/coordination.js");
const prayer = await import("../src/views/prayer.js");
const groups = await import("../src/views/groups.js");
const care = await import("../src/views/care.js");
const derived = await import("../src/core/derived.js");
const st = await import("../src/core/state.js");
const person = st.state.people[0];
const careKey = (derived.activeSignals().find((s) => s.category === "Care") || {}).key || "x";
const modalHost = () => window.document.getElementById("modalHost").innerHTML;
const modals = [
  ["personModal (nova)", () => sticks.personModal(null)],
  ["personModal (editar)", () => sticks.personModal(person)],
  ["milestoneModal", () => sticks.milestoneModal(person.id)],
  ["checkinModal", () => sticks.checkinModal()],
  ["entryModal", () => finance.entryModal()],
  ["postModal", () => coord.postModal()],
  ["taskModal", () => coord.taskModal()],
  ["prayerModal", () => prayer.prayerModal()],
  ["newGroupModal", () => groups.newGroupModal()],
  ["assignCareModal", () => care.assignCareModal(careKey)],
  ["contactModal", () => care.contactModal("any")],
];
let mok = 0, mfail = 0;
for (const [name, fn] of modals) {
  try {
    window.document.getElementById("modalHost").innerHTML = "";
    fn();
    if (modalHost().length > 0) { console.log("  ✓ " + name); mok++; }
    else { console.log("  ✗ " + name + "  (modal vazio)"); mfail++; }
  } catch (e) { console.log("  ✗ " + name + "  ERRO: " + e.message); mfail++; }
}

// --- motores ---
console.log("\n=== Motores (modular) ===");
setState(clone(seedData));
try {
  const sigs = derived.signals();
  const tl = derived.stickTimeline(person);
  console.log("  ✓ signals(): " + sigs.length + " sinais");
  console.log("  ✓ stickTimeline(): " + tl.length + " eventos");
} catch (e) { console.log("  ✗ motores ERRO: " + e.message); fail++; }

// --- smoke test das telas-feature (fora da paridade; ver POLÍTICA acima) ---
// Cada entrada: [nome, () => html, [trechos-chave que PRECISAM aparecer]].
// Renderiza com o seed, afirma que (a) não lança e (b) tem os elementos-chave.
const journeyView = await import("../src/views/journey.js");
const inboxView = await import("../src/views/inbox.js");
const groupsView = await import("../src/views/groups.js");
const studyView = await import("../src/views/study.js");
const sermonsView = await import("../src/views/sermons.js");
const homeView = await import("../src/views/home.js");
const FEATURE_VIEWS = [
  // dashboard graduou na Fase 6: ganhou Community Insights + movimento de Journey/Groups.
  ["dashboard", () => { const s = clone(seedData); s.view = "dashboard"; setState(s); return homeView.viewDashboard(); },
    ["Hoje no Tally", "Comunidade", "sem comunidade", "Pessoas sem comunidade"]],
  ["journey", () => { const s = clone(seedData); s.view = "journey"; setState(s); return journeyView.viewJourney(); },
    ["Journey Map", 'data-jstage="first_visit"', 'data-jstage="leadership"', "Primeira visita", "Liderança", "jmap-row"]],
  // inbox graduou na Fase 4: passou a emitir Group Signals (ex.: grupos sem líder no seed).
  ["inbox", () => { const s = clone(seedData); s.view = "inbox"; setState(s); return inboxView.viewInbox(); },
    ["Inbox", 'data-inboxcat="Groups"', "sem líder atribuído", "filtchips"]],
  // detalhe de grupo ganhou presença de grupo + gestão de líder (fase Groups completo).
  // A LISTA de grupos segue na paridade (VIEWS); o detalhe não era coberto — smoke aqui.
  ["group-detail", () => { setState(clone(seedData)); return groupsView.viewGroupDetail("Célula Norte"); },
    ["Registrar presença", "Presença recente", 'id="gd-leader"', "Líder"]],
  // study (Trilhas / Discipleship Tracks) é tela nova — não existe no monólito, só smoke.
  ["study", () => { const s = clone(seedData); s.view = "study"; setState(s); return studyView.viewStudy(); },
    ["Trilhas", 'id="newTrack"', "Nenhuma trilha ainda"]],
  // sermons (Study — Sermon Library + editor + Séries) é tela nova — só smoke.
  ["sermons", () => { const s = clone(seedData); s.view = "sermons"; setState(s); return sermonsView.viewSermons(); },
    ["Estudo", 'id="newSermon"', "Nenhum sermão ainda", 'data-sermonstatus="ready"', "Séries", 'id="newSeries"', "Nenhuma série ainda", 'id="openMap"']],
  // series-workspace (Study · Fase 2) — visão/tema, escrituras-chave derivadas das
  // passagens reais, cronograma dos sermões da série. Semeia série + sermão vinculado.
  ["series-workspace", () => {
    const s = clone(seedData); s.view = "sermons";
    s.series = [{ id: "se-1", title: "O Bom Pastor", theme: "Confiança", description: "Quem é o Pastor.", status: "active", start_date: "", end_date: "" }];
    s.sermons = [{ id: "sm-1", title: "A voz que conhece", series_id: "se-1", status: "ready", sermon_date: "2026-03-01", main_passage: "John 10:1-18", campus: "", big_idea: "", content: {} }];
    s.seriesDetail = "se-1"; setState(s); return sermonsView.viewSermons();
  }, ["O Bom Pastor", "Cronograma", "Escrituras-chave", "John 10:1-18", "A voz que conhece", 'id="editSeries"']],
  // sermon-editor (Study — redesign CANVAS): título H1, subcabeçalho passagem+big idea,
  // seções como blocos no fluxo, rail de estrutura, drawer de Propriedades. Semeia sermão.
  ["sermon-editor", () => {
    const s = clone(seedData); s.view = "sermons";
    s.sermons = [{ id: "sm-e", title: "O Bom Pastor", subtitle: "", main_passage: "John 10:1-18", big_idea: "Ele conhece as ovelhas", status: "preparing", visibility: "church", campus: "", sermon_date: "", series_id: null, content: { outline: "1. A porta", notes: "", illustrations: "", application: "", prayer_response: "" } }];
    s.sermonEdit = "sm-e"; setState(s); return sermonsView.viewSermons();
  }, ["sd-canvas", "sd-title", "O Bom Pastor", "John 10:1-18", 'id="se-notes"', "sd-body-doc", 'id="sec-outline"', 'data-addsec="prayer_response"', "Resposta de oração", 'id="sd-props-open"', 'id="sd-asst-toggle"', 'id="sd-recog"', 'id="sd-compare-open"']],
  // scripture-map (Study · Fase 3a) — cobertura dos 66 livros por uso real; célula por
  // livro com intensidade; clicar num livro lista os sermões. Semeia escrituras reais.
  ["scripture-map", () => {
    const s = clone(seedData); s.view = "sermons";
    s.sermons = [{ id: "sm-1", title: "O Bom Pastor", sermon_date: "2026-03-01", content: {} }];
    s.scriptures = [
      { id: "sc-1", sermon_id: "sm-1", book: "JHN", chapter: 10, verse_start: 1, verse_end: 18, reference: "João 10:1-18" },
      { id: "sc-2", sermon_id: "sm-1", book: "ROM", chapter: 8, verse_start: 28, verse_end: null, reference: "Romanos 8:28" },
    ];
    s.scriptureMap = true; setState(s); return sermonsView.viewSermons();
  }, ["Mapa de Escrituras", '<div class="smap">', 'data-mapbook="JHN"', 'data-mapbook="ROM"', "João", 'id="mapBack"']],
];
console.log("\n=== Smoke de render (telas-feature) ===");
let sok = 0, sfail = 0;
for (const [name, renderFn, must] of FEATURE_VIEWS) {
  try {
    const html = renderFn();
    if (!html || !html.length) throw new Error("render vazio");
    const missing = must.filter((frag) => !html.includes(frag));
    if (missing.length) throw new Error("faltam elementos-chave: " + JSON.stringify(missing));
    console.log("  ✓ " + name + "  (render OK, " + html.length + " chars, " + must.length + " âncoras)");
    sok++;
  } catch (e) { console.log("  ✗ " + name + "  " + e.message); sfail++; }
}

console.log("\n=== Resumo ===");
console.log("  Telas idênticas: " + ok + "/" + VIEWS.length + (fail ? "  (" + fail + " DIFEREM)" : ""));
console.log("  Modais OK: " + mok + "/" + modals.length + (mfail ? "  (" + mfail + " falharam)" : ""));
console.log("  Smoke feature: " + sok + "/" + FEATURE_VIEWS.length + (sfail ? "  (" + sfail + " falharam)" : ""));
if (fail || mfail || sfail) { console.log("\nRESULTADO: FALHOU"); process.exit(1); }
console.log("\nRESULTADO: OK — paridade das telas migradas + smoke das telas-feature");
