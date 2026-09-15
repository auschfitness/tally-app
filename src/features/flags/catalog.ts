// Catálogo de feature flags — FONTE DA VERDADE das chaves, em código. As mesmas chaves
// são semeadas pela migration m51 (`catalog.test.ts` garante que as duas listas não
// divergem); o estado (ligada/desligada, rollout, override por org) vive no banco.
//
// Flag é gate de MATURIDADE ("está pronto?", quem decide é o time), ortogonal ao plano,
// que é gate COMERCIAL ("pagou?", `features/plans`). Um módulo só aparece se
// `flagOn()` E `planAllows()`, nessa ordem. NENHUM dos dois é fronteira de segurança —
// o isolamento entre igrejas é imposto pelo RLS.

export type FlagKey =
  | "finance.ofx_import"
  | "finance.v2"
  | "study.bible_v2"
  | "study.interlinear"
  | "teams.v2"
  | "groups.v2"
  | "billing.checkout"
  | "ui.design_v2";

// Todas as flags, na ordem de exibição no painel.
export const ALL_FLAGS: FlagKey[] = [
  "finance.ofx_import",
  "finance.v2",
  "study.bible_v2",
  "study.interlinear",
  "teams.v2",
  "groups.v2",
  "billing.checkout",
  "ui.design_v2",
];

// Alcance do default global da flag (coluna `rollout`): 'off' não vale para ninguém,
// 'orgs' só para quem tem override, 'all' vale para todas as orgs (se `enabled`).
export type Rollout = "off" | "orgs" | "all";

export const ROLLOUT_ORDER: Rollout[] = ["off", "orgs", "all"];

export const ROLLOUT_LABELS: Record<Rollout, string> = {
  off: "Desligada",
  orgs: "Só igrejas escolhidas",
  all: "Todas as igrejas",
};

const KNOWN = new Set<string>(ALL_FLAGS);

// Chave conhecida? Guarda de tipo: filtra o que vem do banco (uma flag só do SQL, sem
// entrada aqui, não existe para o app) e valida entrada de Server Action.
export function isFlagKey(v: string): v is FlagKey {
  return KNOWN.has(v);
}

// Rollout válido ou null (valor fora da união é erro do chamador, não algo para coagir).
export function parseRollout(v: string): Rollout | null {
  return v === "off" || v === "orgs" || v === "all" ? v : null;
}

// O valor efetivo do DEFAULT GLOBAL (sem override). Espelha em TS a precedência do
// `org_flags` no banco — usado só pelo painel /admin para mostrar o que a org herda.
export function globalOn(flag: { enabled: boolean; rollout: Rollout }): boolean {
  return flag.rollout === "all" && flag.enabled;
}
