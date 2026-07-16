// Domínio Journey Map. Analytics portadas 1:1 de derived.js — SÓ dado real, nunca
// inventado. Estágio é caminho OPERACIONAL, não ranking espiritual (DNA #3).
import { JOURNEY } from "@/features/sticks/domain";
import type { Person } from "@/features/sticks/types";

export const STUCK_DAYS = 30;
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export interface StageStat {
  code: string;
  label: string;
  pos: number;
  count: number;
  avgDays: number | null;
  stuck: number;
  people: Person[];
}

export interface FunnelRow {
  label: string;
  reached: number;
  dropFromPrev: number | null;
}

export interface MovementBucket {
  key: string;
  label: string;
  count: number;
}

export interface FirstVisit {
  came: number;
  returned: number;
  lost: number;
}

// Distribuição por estágio: contagem, tempo médio no estágio (de entered_stage_at)
// e quantos estão "parados" (≥ STUCK_DAYS). avgDays=null quando não há registro.
export function journeyStats(people: Person[], enteredAtByStick: Map<string, string>, now: Date): StageStat[] {
  const nowMs = now.getTime();
  return JOURNEY.map((j, i) => {
    const inStage = people.filter((p) => p.journeyStage === j[0]);
    const days = inStage
      .map((p) => {
        const at = enteredAtByStick.get(p.id);
        return at ? Math.floor((nowMs - new Date(at).getTime()) / (1000 * 60 * 60 * 24)) : null;
      })
      .filter((x): x is number => x != null);
    const avg = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
    const stuck = days.filter((d) => d >= STUCK_DAYS).length;
    return { code: j[0], label: j[1], pos: i + 1, count: inStage.length, avgDays: avg, stuck, people: inStage };
  });
}

// Funil cumulativo: quantos "alcançaram" cada estágio (a jornada é monotônica).
export function journeyFunnel(stats: StageStat[]): FunnelRow[] {
  let acc = 0;
  const reached: number[] = [];
  for (let i = stats.length - 1; i >= 0; i--) {
    acc += stats[i]!.count;
    reached[i] = acc;
  }
  return stats.map((s, i) => {
    const prev = i > 0 ? reached[i - 1]! : reached[i]!;
    const drop = prev > 0 ? Math.round((1 - reached[i]! / prev) * 100) : 0;
    return { label: s.label, reached: reached[i]!, dropFromPrev: i > 0 ? drop : null };
  });
}

// Movimento por mês (mudanças de estágio) dos últimos `months`, de timeline_events.
export function journeyMovement(occurredAts: string[], months: number, now: Date): MovementBucket[] {
  const buckets: MovementBucket[] = [];
  const idx = new Map<string, number>();
  for (let k = months - 1; k >= 0; k--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
    idx.set(key, buckets.length);
    buckets.push({ key, label: MONTHS_PT[dt.getMonth()]!, count: 0 });
  }
  for (const at of occurredAts) {
    const mk = (at || "").slice(0, 7);
    const i = idx.get(mk);
    if (i != null) buckets[i]!.count++;
  }
  return buckets;
}

// Evasão 1ª → 2ª visita, dos milestones reais (quem veio uma vez e não voltou).
export function firstVisitDrop(codesByStick: Map<string, Set<string>>): FirstVisit {
  let came = 0;
  let returned = 0;
  for (const codes of codesByStick.values()) {
    if (codes.has("first_visit")) {
      came++;
      if (codes.has("second_visit")) returned++;
    }
  }
  return { came, returned, lost: came - returned };
}
