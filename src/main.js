// Ponto de entrada do Tally. Carrega o CSS, aplica o tema, registra os
// listeners globais (via events.js, que puxa render → telas) e inicia o app
// (gate de login → onboarding → carregar a org do Supabase).

import "./styles.css";
import { applyTheme } from "./core/theme.js";
import "./core/events.js"; // registra navegação + listeners e importa todas as telas
import { startApp } from "./core/supabase.js";

applyTheme();
startApp();

// Preview de desenvolvimento — NÃO vai para o build de produção (import.meta.env.DEV).
// Renderiza qualquer tela com os dados de exemplo, sem precisar de login.
// No console do navegador: __tallyPreview('finance'), __tallyPreview('prayer'), etc.
if (import.meta.env && import.meta.env.DEV) {
  Promise.all([
    import("./dev/seed.js"),
    import("./core/state.js"),
    import("./core/render.js"),
    import("./core/supabase.js"),
  ]).then(([{ seed }, stateMod, { render }, { hideGate }]) => {
    var setState = stateMod.setState;
    window.__tallyPreview = function (v) {
      var s = seed();
      s.view = v || "dashboard";
      setState(s);
      hideGate();
      render();
    };
    // Hooks de verificação (dev-only): acessam o state/render REAIS do app, evitando a
    // duplicação de instância de módulo que ocorre ao importar via console.
    window.__tallyState = function () { return stateMod.state; };
    window.__tallyInject = function (patch) { Object.assign(stateMod.state, patch || {}); hideGate(); render(); };
    console.log("[dev] preview pronto — use __tallyPreview('dashboard'), __tallyInject({...})");
  });
}
