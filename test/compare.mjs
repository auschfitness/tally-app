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
const teamsView = await import("../src/views/teams.js");
const servicesView = await import("../src/views/services.js");
const eventsView = await import("../src/views/events.js");
const FEATURE_VIEWS = [
  // dashboard graduou na Fase 6: ganhou Community Insights + movimento de Journey/Groups.
  ["dashboard", () => { const s = clone(seedData); s.view = "dashboard"; setState(s); return homeView.viewDashboard(); },
    ["Hoje no Tally", "Comunidade", "sem comunidade", "Pessoas sem comunidade"]],
  // dashboard-study (Fase 6): painel de Estudo na Home aparece com dado real de ensino.
  ["dashboard-study", () => {
    const s = clone(seedData); s.view = "dashboard";
    s.sermons = [{ id: "sm-1", title: "O Bom Pastor", main_passage: "João 10:1-18", status: "preached", sermon_date: "2026-03-01", content: {} }];
    s.series = [{ id: "se-1", title: "Confiança", theme: "Deus cuida", status: "active" }];
    s.notes = [{ id: "nt-1", title: "Pastoreio", scope: "shared", content: "", tags: [] }];
    setState(s); return homeView.viewDashboard();
  }, ["Estudo", 'data-studyopen="library"', "Último sermão", "O Bom Pastor", "Série atual", "Confiança", "Atividade recente de estudo", "Pastoreio"]],
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
  // track-teaching (Fase 6): detalhe da trilha lista sermões vinculados como material
  // de ensino (content.track_id). Semeia trilha + sermão vinculado.
  ["track-teaching", () => {
    const s = clone(seedData); s.view = "study";
    s.tracks = [{ id: "tr-1", name: "Fundamentos da Fé", description: "", steps: [] }];
    s.trackEnrollments = [];
    s.sermons = [{ id: "sm-1", title: "O Bom Pastor", main_passage: "João 10:1-18", content: { track_id: "tr-1" } }];
    s.trackDetail = "tr-1"; setState(s); return studyView.viewStudy();
  }, ["Fundamentos da Fé", "Material de ensino", 'data-sermonlink="sm-1"', "O Bom Pastor"]],
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
  }, ["sd-canvas", "sd-title", "O Bom Pastor", "John 10:1-18", 'id="se-notes"', "sd-body-doc", 'id="sec-outline"', 'data-addsec="prayer_response"', "Resposta de oração", 'id="sd-props-open"', 'id="sd-asst-toggle"', 'id="sd-recog"', 'id="sd-compare-open"', 'id="sd-memory"', 'id="sd-related"', 'id="se-track"', 'id="se-service"']],
  // study-notes (Study · Fase 4) — sub-nav do Estudo + lista de notas com escopo e
  // vínculos leves. Semeia uma nota compartilhada vinculada a um sermão.
  ["study-notes", () => {
    const s = clone(seedData); s.view = "sermons"; s.studyTab = "notes";
    s.sermons = [{ id: "sm-1", title: "O Bom Pastor", content: {} }];
    s.notes = [{ id: "nt-1", title: "Pastoreio", content: "Reflexão sobre cuidado.", scope: "shared", sermon_id: "sm-1", series_id: null, scripture_ref: "João 10:1-18", topic: "Cuidado", tags: ["graça"] }];
    setState(s); return sermonsView.viewSermons();
  }, ["Estudo", 'data-studytab="notes"', 'id="newNote"', "Pastoreio", "Compartilhada", "João 10:1-18"]],
  // study-notes vazio — vazio honesto.
  ["study-notes-empty", () => {
    const s = clone(seedData); s.view = "sermons"; s.studyTab = "notes"; s.notes = [];
    setState(s); return sermonsView.viewSermons();
  }, ['id="newNote"', "Nenhuma nota ainda"]],
  // study-resources (Study · Fase 4) — acervo com filtro por tipo/tópico. Semeia recurso.
  ["study-resources", () => {
    const s = clone(seedData); s.view = "sermons"; s.studyTab = "resources";
    s.resources = [{ id: "rs-1", title: "O Conhecimento do Santo", author: "A. W. Tozer", type: "book", url: "", description: "Sobre os atributos de Deus.", topic: "Teologia", tags: ["Deus"], sermon_id: null }];
    setState(s); return sermonsView.viewSermons();
  }, ["Estudo", 'data-studytab="resources"', 'id="newResource"', 'data-restype="book"', "O Conhecimento do Santo", "A. W. Tozer"]],
  // study-resources vazio — vazio honesto.
  ["study-resources-empty", () => {
    const s = clone(seedData); s.view = "sermons"; s.studyTab = "resources"; s.resources = [];
    setState(s); return sermonsView.viewSermons();
  }, ['id="newResource"', "Nenhum recurso ainda"]],
  // study-search (Study · Fase 5) — busca no client agrupada por tipo. Semeia dados
  // e uma query que casa com sermão + nota + referência + série.
  ["study-search", () => {
    const s = clone(seedData); s.view = "sermons"; s.studyTab = "search"; s.studySearchQuery = "pastor";
    s.sermons = [{ id: "sm-1", title: "O Bom Pastor", main_passage: "João 10:1-18", big_idea: "Ele conhece", content: {} }];
    s.notes = [{ id: "nt-1", title: "Pastoreio", content: "cuidado", scope: "shared", topic: "pastor", tags: [] }];
    s.scriptures = [{ id: "sc-1", sermon_id: "sm-1", book: "JHN", chapter: 10, reference: "João 10:1-18" }];
    s.series = [{ id: "se-1", title: "O Pastor", theme: "pastoreio" }];
    setState(s); return sermonsView.viewSermons();
  }, ['data-studytab="search"', 'id="study-search"', 'id="study-results"', "Sermões", "Notas", "Séries", "O Bom Pastor"]],
  // study-search vazio (sem query) — prompt honesto.
  ["study-search-empty", () => {
    const s = clone(seedData); s.view = "sermons"; s.studyTab = "search"; s.studySearchQuery = "";
    setState(s); return sermonsView.viewSermons();
  }, ['id="study-search"', "Escreva para buscar"]],
  // teams-empty (Step 7 · Fase 1) — módulo Serviço vazio honesto.
  ["teams-empty", () => {
    const s = clone(seedData); s.view = "teams"; s.ministries = []; s.teams = []; s.teamMembers = []; s.teamDetail = null;
    setState(s); return teamsView.viewTeams();
  }, ["Times", 'id="newTeam"', 'id="newMinistry"', "Nenhum time ainda"]],
  // teams-list (Fase 1) — ministérios como seções + cards de time.
  ["teams-list", () => {
    const s = clone(seedData); s.view = "teams"; s.teamDetail = null;
    s.ministries = [{ id: "mn-1", name: "Louvor", description: "", campus: "", leader_id: null, status: "active" }];
    s.teams = [{ id: "tk-1", ministry_id: "mn-1", name: "Banda", description: "Música ao vivo", campus: "", leader_id: null, serving_roles: ["Vocal", "Guitarra"], status: "active" }];
    s.teamMembers = [];
    setState(s); return teamsView.viewTeams();
  }, ["Times", "Louvor", 'data-teamdetail="tk-1"', "Banda", "0 servindo"]],
  // team-detail (Fase 1) — quem serve + papéis + adicionar pessoa. Semeia membro real.
  ["team-detail", () => {
    const s = clone(seedData); s.view = "teams";
    const pid = s.people[0].id;
    s.teams = [{ id: "tk-1", ministry_id: null, name: "Banda", description: "", campus: s.activeCampus, leader_id: pid, serving_roles: ["Vocal", "Guitarra"], status: "active" }];
    s.teamMembers = [{ id: "tmr-1", team_id: "tk-1", stick_id: pid, role: "Vocal", status: "active", availability: "quinzenal", joined_at: "2026-01-01", notes: "" }];
    s.teamDetail = "tk-1";
    setState(s); return teamsView.viewTeams();
  }, ["Voltar aos times", "Quem serve", "Papéis de serviço", "Vocal", 'data-memremove="tmr-1"', "líder", 'id="editTeam"']],
  // ministry-dashboard (Step 7 · Fase 2) — consciência operacional do ministério.
  ["ministry-dashboard", () => {
    const s = clone(seedData); s.view = "teams"; s.teamDetail = null;
    const pid = s.people[0].id;
    s.ministries = [{ id: "mn-1", name: "Louvor", description: "Adoração", campus: "", leader_id: null, status: "active" }];
    s.teams = [
      { id: "tk-1", ministry_id: "mn-1", name: "Banda", campus: "", leader_id: pid, serving_roles: ["Vocal"], status: "active" },
      { id: "tk-2", ministry_id: "mn-1", name: "Mídia", campus: "", leader_id: null, serving_roles: [], status: "active" },
    ];
    s.teamMembers = [{ id: "tmr-1", team_id: "tk-1", stick_id: pid, role: "Vocal", status: "active", availability: "", joined_at: "", notes: "" }];
    s.ministryDetail = "mn-1";
    setState(s); return teamsView.viewTeams();
  }, ["Louvor", "Distribuição de serviço", 'data-teamdetail="tk-1"', "Banda", "Mídia", "sem líder", "servindo"]],
  // team-detail-dist (Fase 2) — painel de distribuição por papel + status no time.
  ["team-detail-dist", () => {
    const s = clone(seedData); s.view = "teams";
    const pid = s.people[0].id, pid2 = s.people[1].id;
    s.teams = [{ id: "tk-1", ministry_id: null, name: "Banda", campus: s.activeCampus, leader_id: pid, serving_roles: ["Vocal", "Guitarra"], status: "active" }];
    s.teamMembers = [
      { id: "tmr-1", team_id: "tk-1", stick_id: pid, role: "Vocal", status: "active", availability: "", joined_at: "", notes: "" },
      { id: "tmr-2", team_id: "tk-1", stick_id: pid2, role: "Vocal", status: "paused", availability: "", joined_at: "", notes: "" },
    ];
    s.teamDetail = "tk-1";
    setState(s); return teamsView.viewTeams();
  }, ["Distribuição de serviço", "Vocal", "Guitarra", "ninguém ainda", "servindo", "em pausa"]],
  // schedule-board (Step 7 · Fase 3) — board semanal com avatares; escalação por data
  // com status. Semeia uma escalação na semana da âncora.
  ["schedule-board", () => {
    const s = clone(seedData); s.view = "teams"; s.scheduleView = true; s.scheduleAnchor = "2026-03-01";
    const pid = s.people[0].id;
    s.teams = [{ id: "tk-1", ministry_id: null, name: "Banda", campus: s.activeCampus, leader_id: null, serving_roles: ["Vocal"], status: "active" }];
    s.teamMembers = [];
    s.schedule = [{ id: "as-1", team_id: "tk-1", role: "Vocal", stick_id: pid, assignment_date: "2026-03-04", status: "assigned", service_id: null, event_id: null, confirmed_at: null }];
    setState(s); return teamsView.viewTeams();
  }, ["Escala", 'id="schedPrev"', 'id="schedNext"', 'id="schedAdd"', "Banda", "Vocal", "Escalado", 'data-asgstatus="as-1"']],
  // schedule-empty (Fase 3) — board sem escalações mostra os dias vazios ("—").
  ["schedule-empty", () => {
    const s = clone(seedData); s.view = "teams"; s.scheduleView = true; s.scheduleAnchor = "2026-03-01"; s.schedule = []; s.teams = [];
    setState(s); return teamsView.viewTeams();
  }, ["Escala", 'id="schedAdd"', 'data-schedadd=']],
  // team-health (Step 7 · Fase 4) — painel de saúde do time: observações operacionais
  // (tamanho, líder, papel descoberto), NÃO um score. Sem escala → nota honesta.
  ["team-health", () => {
    const s = clone(seedData); s.view = "teams";
    const pid = s.people[0].id;
    s.teams = [{ id: "tk-1", ministry_id: null, name: "Banda", campus: s.activeCampus, leader_id: null, serving_roles: ["Vocal", "Bateria"], status: "active" }];
    s.teamMembers = [{ id: "tmr-1", team_id: "tk-1", stick_id: pid, role: "Vocal", status: "active", availability: "", joined_at: "", notes: "" }];
    s.schedule = [];
    s.teamDetail = "tk-1";
    setState(s); return teamsView.viewTeams();
  }, ["Saúde do time", "consciência operacional, não nota", "Sem líder definido", "Papel sem ninguém: Bateria", "Ainda sem escalações"]],
  // inbox-teams (Step 7 · Fase 5) — signals de serviço na aba Serviço do Inbox.
  ["inbox-teams", () => {
    const s = clone(seedData); s.view = "inbox"; s.inboxCat = "Teams";
    const c = s.activeCampus;
    const p1 = s.people[0], p2 = s.people[1]; p1.campus = c; p2.campus = c;
    s.teams = [{ id: "tk-1", ministry_id: null, name: "Banda", campus: c, leader_id: null, serving_roles: [], status: "active" }];
    s.teamMembers = [
      { id: "tmr-1", team_id: "tk-1", stick_id: p1.id, role: "", status: "active", availability: "", joined_at: "", notes: "" },
      { id: "tmr-2", team_id: "tk-1", stick_id: p2.id, role: "", status: "active", availability: "", joined_at: "", notes: "" },
    ];
    s.schedule = [];
    setState(s); return inboxView.viewInbox();
  }, ['data-inboxcat="Teams"', "depende de poucas pessoas", "sem líder"]],
  // team-leadership (Step 7 · Fase 6) — escada de desenvolvimento de liderança no time.
  ["team-leadership", () => {
    const s = clone(seedData); s.view = "teams";
    const p1 = s.people[0].id, p2 = s.people[1].id, p3 = s.people[2].id;
    s.teams = [{ id: "tk-1", ministry_id: null, name: "Banda", campus: s.activeCampus, leader_id: p1, serving_roles: ["Vocal"], status: "active" }];
    s.teamMembers = [
      { id: "tmr-1", team_id: "tk-1", stick_id: p1, role: "Vocal", status: "active", availability: "", joined_at: "", notes: "" },
      { id: "tmr-2", team_id: "tk-1", stick_id: p2, role: "Vocal", status: "active", availability: "", joined_at: "", notes: "" },
      { id: "tmr-3", team_id: "tk-1", stick_id: p3, role: "Vocal", status: "active", availability: "", joined_at: "", notes: "" },
    ];
    s.leadershipDev = { "tmr-2": "apprentice", "tmr-3": "co_leader" };
    s.teamDetail = "tk-1";
    setState(s); return teamsView.viewTeams();
  }, ["Desenvolvimento de liderança", "um caminho de crescimento, não uma nota", "Aprendiz", "Co-líder", "Servindo", "Líder"]],
  // services-empty (Step 6 · Fase 1) — módulo Cultos vazio honesto.
  ["services-empty", () => {
    const s = clone(seedData); s.view = "services"; s.services = []; s.serviceDetail = null;
    setState(s); return servicesView.viewServices();
  }, ["Cultos", 'id="newService"', "Nenhum culto ainda"]],
  // services-list (Fase 1) — cards de culto com dia/horário e ocorrências.
  ["services-list", () => {
    const s = clone(seedData); s.view = "services"; s.serviceDetail = null;
    s.services = [{ id: "sv-1", name: "Culto de Domingo", type: "Domingo", campus: s.activeCampus, weekday: 0, start_time: "09:00", end_time: "11:00", location: "Templo", recurring_pattern: "weekly", description: "", active: true }];
    s.sessions = [{ id: "se-1", campus: s.activeCampus, group: "", service: "sv-1", date: "2026-03-01", attendees: ["a", "b"], photo: null }];
    setState(s); return servicesView.viewServices();
  }, ["Cultos", 'data-servicedetail="sv-1"', "Culto de Domingo", "Domingo", "09:00", "1 ocorrência"]],
  // service-detail (Fase 1) — info + presenças recentes ligadas ao culto + registrar presença.
  ["service-detail", () => {
    const s = clone(seedData); s.view = "services";
    s.services = [{ id: "sv-1", name: "Culto de Domingo", type: "Domingo", campus: s.activeCampus, weekday: 0, start_time: "09:00", end_time: "", location: "Templo", recurring_pattern: "weekly", description: "Principal", active: true }];
    s.sessions = [{ id: "se-1", campus: s.activeCampus, group: "", service: "sv-1", date: "2026-03-01", attendees: ["a", "b", "c"], photo: null }];
    s.serviceDetail = "sv-1";
    setState(s); return servicesView.viewServices();
  }, ["Voltar aos cultos", "Presença", "últimas", "Ordem do culto", "Presenças recentes", "3 presentes", 'id="serviceCheckin"', 'id="editService"', "Sobre o culto"]],
  // service-plan (Step 6 · Fase 2) — ordem do culto com itens + composição de presença.
  ["service-plan", () => {
    const s = clone(seedData); s.view = "services";
    const p0 = s.people[0].id, p1 = s.people[1].id;
    s.services = [{ id: "sv-1", name: "Culto de Domingo", type: "Domingo", campus: s.activeCampus, weekday: 0, start_time: "09:00", end_time: "", location: "", recurring_pattern: "weekly", description: "", active: true }];
    s.sessions = [{ id: "se-1", campus: s.activeCampus, group: "", service: "sv-1", date: "2026-03-01", attendees: [p0, p1], photo: null }];
    s.planItems = [
      { id: "pl-1", service_id: "sv-1", session_id: null, position: 1, time_label: "09:00", title: "Louvor", duration_min: 20, responsible: "Banda", notes: "" },
      { id: "pl-2", service_id: "sv-1", session_id: null, position: 2, time_label: "09:25", title: "Mensagem", duration_min: 35, responsible: "Pr. João", notes: "" },
    ];
    s.serviceDetail = "sv-1";
    setState(s); return servicesView.viewServices();
  }, ["Ordem do culto", "Louvor", "Mensagem", "20 min", "Banda", 'data-planedit="pl-1"', 'data-plandown="pl-1"', 'id="addPlanItem"', "presentes (última)"]],
  // service-connections (Step 6 · Fase 3) — sermão do Study + times escalados no culto.
  ["service-connections", () => {
    const s = clone(seedData); s.view = "services";
    s.services = [{ id: "sv-1", name: "Culto de Domingo", type: "Domingo", campus: s.activeCampus, weekday: 0, start_time: "09:00", end_time: "", location: "", recurring_pattern: "weekly", description: "", active: true }];
    s.sessions = [];
    s.sermons = [{ id: "sm-1", title: "O Bom Pastor", main_passage: "João 10:1-18", service_id: "sv-1", content: {} }];
    s.teams = [{ id: "tk-1", name: "Banda", serving_roles: [], status: "active" }];
    s.schedule = [{ id: "as-1", team_id: "tk-1", role: "Vocal", stick_id: s.people[0].id, assignment_date: "2026-03-01", status: "confirmed", service_id: "sv-1", event_id: null, confirmed_at: null }];
    s.serviceDetail = "sv-1";
    setState(s); return servicesView.viewServices();
  }, ["Ensino deste culto", 'data-svcsermon="sm-1"', "O Bom Pastor", "Times escalados", "Banda", "Vocal"]],
  // events-empty (Step 6 · Fase 4) — módulo Eventos vazio honesto.
  ["events-empty", () => {
    const s = clone(seedData); s.view = "events"; s.events = []; s.eventRegs = []; s.eventDetail = null;
    setState(s); return eventsView.viewEvents();
  }, ["Eventos", 'id="newEvent"', "Nenhum evento ainda"]],
  // events-list (Fase 4) — cards de evento com data/status/capacidade.
  ["events-list", () => {
    const s = clone(seedData); s.view = "events"; s.eventDetail = null;
    s.events = [{ id: "ev-1", name: "Conferência de Jovens", type: "Conferência", campus: s.activeCampus, event_date: "2026-05-10", start_time: "19:00", end_time: "", location: "Templo", capacity: 100, registration_required: true, payment_required: false, check_in_enabled: true, status: "active", description: "" }];
    s.eventRegs = [{ id: "rg-1", event_id: "ev-1", stick_id: s.people[0].id, name: "", email: "", phone: "", household: "", answers: {}, payment_status: "", checked_in: false, checked_in_at: null }];
    setState(s); return eventsView.viewEvents();
  }, ["Eventos", 'data-eventdetail="ev-1"', "Conferência de Jovens", "10/05/2026", "1/100"]],
  // event-detail (Fase 4) — inscrições internas + check-in + identificar visitante.
  ["event-detail", () => {
    const s = clone(seedData); s.view = "events";
    s.events = [{ id: "ev-1", name: "Retiro", type: "Retiro", campus: s.activeCampus, event_date: "2026-05-10", start_time: "08:00", end_time: "18:00", location: "Sítio", capacity: 50, registration_required: true, payment_required: true, check_in_enabled: true, status: "active", description: "Fim de semana" }];
    s.eventRegs = [
      { id: "rg-1", event_id: "ev-1", stick_id: s.people[0].id, name: "", email: "", phone: "", household: "", answers: {}, payment_status: "", checked_in: true, checked_in_at: "2026-05-10T08:00:00Z" },
      { id: "rg-2", event_id: "ev-1", stick_id: null, name: "Visitante Novo", email: "v@x.com", phone: "", household: "", answers: {}, payment_status: "", checked_in: false, checked_in_at: null },
    ];
    s.eventDetail = "ev-1";
    setState(s); return eventsView.viewEvents();
  }, ["Voltar aos eventos", "Inscrições", "Visitante Novo", 'data-regcheck="rg-2"', 'data-regdel="rg-1"', 'id="registerBtn"', "Presente ✓", "Sobre o evento"]],
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
