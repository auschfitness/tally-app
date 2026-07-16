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
