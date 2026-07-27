// Domínio puro de Settings — opções fixas + leitura SEGURA dos sub-campos do blob
// (nunca assume shape; coage tipos). A escrita cirúrgica no blob mora na action.
import type { AccountConfig, InstitutionConfig } from "./types";

export const CURRENCIES = [
  { value: "BRL", label: "Real (BRL)" },
  { value: "USD", label: "Dólar (USD)" },
];
// Idioma NÃO fica aqui: é por usuário em `profiles.locale` (ver src/lib/i18n).
export const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/Chicago", label: "Central US / Texas (GMT-6)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
];

export function isCurrency(v: string): boolean {
  return CURRENCIES.some((c) => c.value === v);
}
export function isTimezone(v: string): boolean {
  return TIMEZONES.some((t) => t.value === v);
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// Lê institution do blob sem assumir shape. Defaults seguros.
export function readInstitution(data: unknown): InstitutionConfig {
  const inst = asObject(asObject(data).institution);
  const institutions = Array.isArray(inst.institutions) ? inst.institutions.filter((x): x is string => typeof x === "string") : [];
  return { multiInstitution: inst.multiInstitution === true, institutions };
}

// Lê account do blob (só fuso) com default. Idioma vem de profiles.locale (i18n).
export function readAccount(data: unknown): AccountConfig {
  const acc = asObject(asObject(data).account);
  return {
    timezone: isTimezone(String(acc.timezone)) ? String(acc.timezone) : "America/Sao_Paulo",
  };
}

// --- Abas da Administração (hub /settings) — visibilidade por permissão ---
// Reorganização de front: as telas de Geral, Cargos, Jurídico e Membros viram abas de um
// só hub, cada uma gated pela permissão certa; abas que o usuário não pode ver não
// aparecem. "conta" (pessoal — nome/idioma/fuso do próprio usuário) é SEMPRE visível: todo
// usuário mexe na própria conta, então o hub nunca fica sem porta e ninguém perde acesso a
// preferências pessoais (sem regressão). Lógica pura aqui; a página aplica os `can()`.

export type AdminTabKey = "geral" | "cargos" | "juridico" | "membros" | "conta";

export interface AdminPerms {
  canManageOrg: boolean; // org.manage → aba Geral
  canManageMembers: boolean; // members.manage → abas Cargos e Membros
  canManageFiscal: boolean; // org.manage || finance.manage (can_manage_org_fiscal) → aba Jurídico
}

// Ordem canônica das abas no hub.
const ADMIN_TAB_ORDER: AdminTabKey[] = ["geral", "cargos", "juridico", "membros", "conta"];

export function isAdminTabVisible(key: AdminTabKey, perms: AdminPerms): boolean {
  switch (key) {
    case "geral":
      return perms.canManageOrg;
    case "cargos":
      return perms.canManageMembers;
    case "juridico":
      return perms.canManageFiscal;
    case "membros":
      return perms.canManageMembers;
    case "conta":
      return true; // pessoal — sempre visível
  }
}

// Abas visíveis, na ordem canônica. Nunca vazio (ao menos "conta").
export function visibleAdminTabs(perms: AdminPerms): AdminTabKey[] {
  return ADMIN_TAB_ORDER.filter((k) => isAdminTabVisible(k, perms));
}

// Aba efetiva: respeita a pedida (query ?tab=) se o usuário pode vê-la; senão, cai na
// primeira visível — assim quem só tem uma permissão entra direto na aba que pode ver.
export function resolveAdminTab(requested: string | undefined, visible: AdminTabKey[]): AdminTabKey {
  if (requested && (visible as string[]).includes(requested)) return requested as AdminTabKey;
  return visible[0] ?? "conta";
}

// Tem alguma aba ADMINISTRATIVA (fora "conta")? Ou seja: o usuário administra algo da
// igreja. (A porta do menu fica sempre, por causa da Conta pessoal.)
export function hasAnyAdminTab(perms: AdminPerms): boolean {
  return visibleAdminTabs(perms).some((k) => k !== "conta");
}
