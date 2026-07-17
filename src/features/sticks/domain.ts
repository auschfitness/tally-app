// Domínio Sticks (pessoas). É a "interface limpa" que outras features consomem
// (Care, Home, Journey importam estes tipos/regras, não o interior de Sticks).
// Regras portadas 1:1 de src/core/helpers.js e derived.js — sem inventar score,
// só contexto/padrões (DNA #3). "Uma pessoa = uma Stick."
import { weeksSince } from "@/lib/utils/date";

export type Relationship =
  | "visitor_first"
  | "visitor_returning"
  | "attendee"
  | "member"
  | "inactive";

// Nome completo (roadmap #3.2): ao menos 2 palavras, cada uma com ≥2 letras.
// Bloqueia "João"/"Maria"; aceita "João Silva". Conta letras (acentos incluídos),
// então iniciais de 1 letra ("Ana P Silva") não passam — de propósito.
export function isFullName(name: string): boolean {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return words.every((w) => (w.match(/\p{L}/gu) || []).length >= 2);
}

export const RELATIONSHIPS: Relationship[] = [
  "visitor_first",
  "visitor_returning",
  "attendee",
  "member",
  "inactive",
];

const REL_FULL: Record<Relationship, string> = {
  visitor_first: "Visitante 1a vez",
  visitor_returning: "Visitante recorrente",
  attendee: "Frequentador",
  member: "Membro",
  inactive: "Inativo",
};

const REL_SHORT: Record<Relationship, string> = {
  visitor_first: "Visitante",
  visitor_returning: "Visitante",
  attendee: "Frequentador",
  member: "Membro",
  inactive: "Inativo",
};

export function relLabel(rel: Relationship): string {
  return REL_SHORT[rel] ?? "—";
}
export function relLabelFull(rel: Relationship): string {
  return REL_FULL[rel] ?? "—";
}
export function isVisitor(rel: Relationship): boolean {
  return rel === "visitor_first" || rel === "visitor_returning";
}

// Journey — estágios da caminhada (position 1..6 no banco = índice+1).
export const JOURNEY: ReadonlyArray<readonly [string, string]> = [
  ["first_visit", "Primeira visita"],
  ["returned", "Retornou"],
  ["connected", "Conectado"],
  ["group", "Em grupo"],
  ["serving", "Servindo"],
  ["leadership", "Liderança"],
];

export function journeyLabel(code: string): string {
  return JOURNEY.find((j) => j[0] === code)?.[1] ?? "—";
}
export function journeyCodeForPosition(position: number | null | undefined): string {
  if (!position) return "first_visit";
  return JOURNEY[position - 1]?.[0] ?? "first_visit";
}
export function positionForJourneyCode(code: string): number {
  const i = JOURNEY.findIndex((j) => j[0] === code);
  return i < 0 ? 1 : i + 1;
}

// Semanas sem aparecer a partir das quais entra no radar de Care (default do app).
export const CARE_WEEKS_DEFAULT = 3;

export interface CareReason {
  short: string;
  full: string;
}

// Motivos de cuidado — só padrões reais (sumiu, sem grupo, follow-up aberto).
export function careReasons(
  p: { lastSeen: string | null; group: string; followup: boolean },
  careWeeks: number = CARE_WEEKS_DEFAULT,
): CareReason[] {
  const reasons: CareReason[] = [];
  if (weeksSince(p.lastSeen) >= careWeeks) {
    reasons.push({ short: "sem aparecer", full: "Sem aparecer há um tempo" });
  }
  if (!p.group) reasons.push({ short: "sem grupo", full: "Ainda não está em um grupo" });
  if (p.followup) reasons.push({ short: "follow-up", full: "Follow-up em aberto" });
  return reasons;
}

export type CareLevel = "em" | "at" | "ri";

export function careLevel(reasonCount: number): CareLevel {
  return reasonCount === 0 ? "em" : reasonCount === 1 ? "at" : "ri";
}
