// Domínio puro da Home — o "Pulse" da igreja. AGREGAÇÃO/seleção sobre o que as
// features já retornam + a saída do Signals engine. Sem I/O, sem tabela nova.
// Portado de src/views/home.js + src/core/derived.js, COM UMA CORREÇÃO honesta:
// a "Frequência" NÃO é mais dado sintético (o legado inventava base×fatores) —
// aqui vem das sessões de culto REAIS (DNA #2: nada de gráfico falso).
import { careReasons, type CareReason, type Relationship } from "@/features/sticks/domain";
import type { GroupHealth } from "@/features/groups/domain";
import type { Session, Signal, SignalPerson } from "@/features/signals/domain";

export type RiskLevel = "em" | "at" | "ri";
export const RISK_COLOR: Record<RiskLevel, string> = { em: "#1FA97A", at: "#E8833A", ri: "#EA5B4C" };

// Nível pastoral por nº de motivos de cuidado (0=em dia, 1=atenção, ≥2=risco).
export function careLevel(n: number): RiskLevel {
  return n === 0 ? "em" : n === 1 ? "at" : "ri";
}

export interface RiskDist {
  em: number;
  at: number;
  ri: number;
  total: number;
}
export function riskDist(people: SignalPerson[], activeCampus: string, careWeeks?: number): RiskDist {
  let em = 0;
  let at = 0;
  let ri = 0;
  for (const p of people) {
    if (p.campus !== activeCampus) continue;
    const lvl = careLevel(careReasons(p, careWeeks).length);
    if (lvl === "em") em += 1;
    else if (lvl === "at") at += 1;
    else ri += 1;
  }
  return { em, at, ri, total: em + at + ri };
}

// Pessoas sinalizadas para o Care Radar, mais motivos primeiro.
export interface FlaggedPerson {
  id: string;
  name: string;
  reasons: CareReason[];
}
export function flaggedPeople(people: SignalPerson[], activeCampus: string, careWeeks?: number): FlaggedPerson[] {
  return people
    .filter((p) => p.campus === activeCampus)
    .map((p) => ({ id: p.id, name: p.name, reasons: careReasons(p, careWeeks) }))
    .filter((f) => f.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length);
}

// Frequência REAL por semana (últimas N), das sessões de CULTO (service). Soma os
// presentes por semana. Vazio quando não há histórico (nunca inventa números).
export interface WeekPoint {
  label: string;
  count: number;
}
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function weekIndex(ms: number): number {
  return Math.floor(ms / WEEK_MS);
}
export function weeklyAttendance(sessions: Session[], now: Date, weeks = 8): WeekPoint[] {
  const curW = weekIndex(now.getTime());
  const startW = curW - (weeks - 1);
  const points: WeekPoint[] = [];
  for (let w = startW; w <= curW; w++) {
    const d = new Date(w * WEEK_MS);
    points.push({ label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, count: 0 });
  }
  for (const s of sessions) {
    if (!s.service || !s.date) continue;
    const wi = weekIndex(new Date(s.date + "T00:00:00Z").getTime());
    const idx = wi - startW;
    if (idx >= 0 && idx < weeks) points[idx]!.count += (s.attendees ?? []).length;
  }
  return points;
}

// Padrões de comunidade (só dado real). movement30 vem das timeline de jornada.
export interface CommunityPerson {
  id: string;
  name: string;
  relationship: Relationship;
}
export interface CommunityInsights {
  total: number;
  inGroup: number;
  noGroup: CommunityPerson[];
  connRate: number;
  groupsNoNew: number;
  groupsNoLeader: number;
  movement30: number;
}
export function communityInsights(people: SignalPerson[], groupsHealth: GroupHealth[], movement30: number, activeCampus: string): CommunityInsights {
  const ppl = people.filter((p) => p.campus === activeCampus);
  const noGroup = ppl.filter((p) => !p.group);
  const inGroup = ppl.length - noGroup.length;
  return {
    total: ppl.length,
    inGroup,
    noGroup: noGroup.map((p) => ({ id: p.id, name: p.name, relationship: p.relationship })),
    connRate: ppl.length ? Math.round((inGroup / ppl.length) * 100) : 0,
    groupsNoNew: groupsHealth.filter((g) => (g.newMembers || 0) === 0).length,
    groupsNoLeader: groupsHealth.filter((g) => g.noLeader).length,
    movement30,
  };
}

// Signals visíveis na Home = tudo menos os DISPENSADOS (paridade com activeSignals
// do legado; adiados/atribuídos ainda contam no Pulse, diferente do feed do Inbox).
export function homeVisibleSignals(all: Signal[], overrides: Map<string, string>): Signal[] {
  return all.filter((s) => overrides.get(s.key) !== "dismissed");
}

// Celebrações recentes (para "Para celebrar").
export function celebrations(visible: Signal[], limit = 6): Signal[] {
  return visible.filter((s) => s.level === "celebration").slice(0, limit);
}

// Contadores da faixa "Hoje no Tally".
export interface TodayCounts {
  care: number;
  groupsAtt: number;
  noComm: number;
  celeb: number;
  prayersAnswered: number;
}
export function todayCounts(
  visible: Signal[],
  groupsHealth: GroupHealth[],
  people: SignalPerson[],
  activeCampus: string,
  prayersAnswered: number,
): TodayCounts {
  return {
    care: visible.filter((s) => s.category === "Care").length,
    groupsAtt: groupsHealth.filter((g) => g.band !== "healthy").length,
    noComm: people.filter((p) => p.campus === activeCampus && !p.group).length,
    celeb: visible.filter((s) => s.level === "celebration").length,
    prayersAnswered,
  };
}
