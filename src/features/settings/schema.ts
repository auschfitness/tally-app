// Validação na fronteira do servidor. Nome da org obrigatório; moeda/fuso coagidos a
// valores conhecidos. Idioma é gravado à parte (profiles.locale via setLocaleAction).
import { isCurrency, isTimezone } from "./domain";

export interface OrgInput {
  name: string;
  currency: string;
}
export type ValidatedOrg = { ok: true; data: OrgInput } | { ok: false; fieldErrors: Record<string, string[]> };

export function parseOrgInput(fd: FormData): ValidatedOrg {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome à instituição."] } };
  const currency = String(fd.get("currency") ?? "");
  return { ok: true, data: { name, currency: isCurrency(currency) ? currency : "BRL" } };
}

export interface AccountInput {
  fullName: string;
  timezone: string;
}
export function parseAccountInput(fd: FormData): AccountInput {
  const timezone = String(fd.get("timezone") ?? "");
  return {
    fullName: String(fd.get("fullName") ?? "").trim(),
    timezone: isTimezone(timezone) ? timezone : "America/Sao_Paulo",
  };
}
