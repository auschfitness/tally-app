// Dicionário FONTE (pt-BR). O tipo `Dictionary` é derivado deste objeto — en/es
// devem preencher TODAS as chaves (o typecheck cobra completude). Cresce por feature
// nas próximas fatias (3b). Termos de produto (Stick, Signal, Care, Journey,
// Milestone, Pulse, Inbox, Finance Lite, Care Radar, Journey Map, Timeline) NÃO
// entram aqui — ficam em inglês em qualquer idioma.
export const ptBR = {
  settings: {
    title: "Configurações",
    subtitle: "Ajustes da instituição e da sua conta",
    tabInstitution: "Instituição",
    tabAccount: "Conta",
    yourName: "Seu nome",
    yourNamePlaceholder: "Como você aparece na equipe",
    language: "Idioma",
    languageHint: "Vale só para você",
    timezone: "Fuso horário",
    theme: "Tema",
    themeHint: "Ajuste o tema (claro/escuro) pelo botão no topo da tela.",
    role: "Cargo",
    roleOwner: "Dono da conta",
    roleMember: "Membro da equipe",
    save: "Salvar",
    saving: "Salvando…",
  },
};

// Sem `as const`: os valores são `string` (não literais) → en/es só precisam ter as
// MESMAS chaves (o typecheck cobra completude), com qualquer texto.
export type Dictionary = typeof ptBR;
