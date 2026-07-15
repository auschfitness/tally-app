// Domínio de Cultos. Regras portadas 1:1 de src/views/services.js — só dado real,
// nada de planilha/score. Puro e testável.
import type { Relationship } from "@/features/sticks/domain";
import type { Service } from "./types";

export const WD = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const PATTERN_LBL: Record<string, string> = { weekly: "Semanal", monthly: "Mensal", custom: "Personalizado" };

// "Domingo · 09:00–10:30" | "Domingo" | "09:00" | "sem horário definido".
export function whenLabel(s: { weekday: number | null; start_time: string; end_time: string }): string {
  const parts: string[] = [];
  if (s.weekday !== null && s.weekday !== undefined) parts.push(WD[s.weekday] ?? "");
  if (s.start_time) parts.push(s.start_time + (s.end_time ? "–" + s.end_time : ""));
  return parts.filter(Boolean).join(" · ") || "sem horário definido";
}

// Ordena por dia da semana (sem dia = 9, ao fim) e depois por horário de início.
export function sortServices(list: Service[]): Service[] {
  return list.slice().sort((a, b) => {
    const wa = a.weekday == null ? 9 : a.weekday;
    const wb = b.weekday == null ? 9 : b.weekday;
    if (wa !== wb) return wa - wb;
    return (a.start_time || "").localeCompare(b.start_time || "");
  });
}

// Composição da presença (só dado real). "kids" = idade conhecida < 12.
export interface Composition {
  total: number;
  visitors: number;
  first: number;
  returning: number;
  kids: number;
}
export function composition(present: { relationship: Relationship; age: number | null }[]): Composition {
  const c: Composition = { total: 0, visitors: 0, first: 0, returning: 0, kids: 0 };
  for (const p of present) {
    c.total++;
    if (p.relationship === "visitor_first") { c.visitors++; c.first++; }
    else if (p.relationship === "visitor_returning") { c.visitors++; c.returning++; }
    if (p.age !== null && p.age < 12) c.kids++;
  }
  return c;
}

// Alturas das barras de tendência (px) das últimas `n` ocorrências. Maior = 80px.
export interface TrendBar {
  date: string;
  count: number;
  height: number;
}
export function trendBars(sessionsAsc: { date: string; count: number }[], n: number): TrendBar[] {
  const last = sessionsAsc.slice(-n);
  const max = last.reduce((m, s) => Math.max(m, s.count), 0) || 1;
  return last.map((s) => ({ date: s.date, count: s.count, height: Math.round((s.count / max) * 78) + 2 }));
}
