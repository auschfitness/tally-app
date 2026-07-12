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

const VIEWS = ["dashboard", "inbox", "people", "care", "journey", "groups", "coord", "prayer", "finance", "settings"];
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

console.log("\n=== Resumo ===");
console.log("  Telas idênticas: " + ok + "/" + VIEWS.length + (fail ? "  (" + fail + " DIFEREM)" : ""));
console.log("  Modais OK: " + mok + "/" + modals.length + (mfail ? "  (" + mfail + " falharam)" : ""));
if (fail || mfail) { console.log("\nRESULTADO: FALHOU"); process.exit(1); }
console.log("\nRESULTADO: OK — paridade total");
