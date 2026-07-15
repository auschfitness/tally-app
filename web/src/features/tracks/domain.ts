// Domínio puro de Trilhas — regras portadas de src/views/study.js e
// src/core/tracks-repo.js, sem estado global nem I/O. Progresso é PARTICIPAÇÃO
// (etapas concluídas), nunca nota (DNA #3). Testado por ramo em domain.test.ts.
import type { Enrollment, Track, TrackStep } from "./types";

// Etapas ordenadas pela posição (cópia — não muta o array recebido).
export function sortSteps(steps: TrackStep[]): TrackStep[] {
  return steps.slice().sort((a, b) => a.position - b.position);
}

// Próxima posição ao adicionar uma etapa ao fim (1-based, como o legado).
export function nextPosition(steps: TrackStep[]): number {
  return steps.length + 1;
}

// 1ª etapa (onde a matrícula começa) ou null se a trilha ainda não tem etapas.
export function firstStepId(steps: TrackStep[]): string | null {
  const sorted = sortSteps(steps);
  return sorted.length ? sorted[0]!.id : null;
}

// Posição/percentual de UMA matrícula para exibição ("Nome · 3 de 5" + barra).
// Concluída ocupa o total; sem etapa atual conhecida = 0. Espelha o cálculo do
// detalhe legado (viewTrackDetail).
export interface EnrollmentPosition {
  pos: number;
  total: number;
  pct: number;
  completed: boolean;
}
export function enrollmentPosition(enrollment: Pick<Enrollment, "status" | "current_step_id">, steps: TrackStep[]): EnrollmentPosition {
  const sorted = sortSteps(steps);
  const total = sorted.length;
  const completed = enrollment.status === "completed";
  const curIdx = sorted.findIndex((s) => s.id === enrollment.current_step_id);
  const pos = completed ? total : curIdx >= 0 ? curIdx + 1 : 0;
  const pct = total ? Math.round((pos / total) * 100) : 0;
  return { pos, total, pct, completed };
}

// Resumo de um card de trilha: nº de etapas, matriculados e concluídos.
export interface TrackSummary {
  steps: number;
  enrolled: number;
  completed: number;
}
export function trackSummary(track: Track, enrollments: Enrollment[]): TrackSummary {
  const ens = enrollments.filter((e) => e.track_id === track.id);
  return {
    steps: track.steps.length,
    enrolled: ens.length,
    completed: ens.filter((e) => e.status === "completed").length,
  };
}

// Decisão pura de "avançar etapa": avança para a próxima, conclui se era a última,
// ou nada (já concluída / trilha sem etapas). O progresso segue o legado:
// round(nextIdx / total * 100). A action aplica o efeito (update / milestone).
export type AdvancePlan =
  | { kind: "noop" }
  | { kind: "advance"; stepId: string; progress: number }
  | { kind: "complete"; progress: 100 };

export function planAdvance(enrollment: Pick<Enrollment, "status" | "current_step_id">, steps: TrackStep[]): AdvancePlan {
  if (enrollment.status === "completed") return { kind: "noop" };
  const sorted = sortSteps(steps);
  if (!sorted.length) return { kind: "noop" };
  const curIdx = sorted.findIndex((s) => s.id === enrollment.current_step_id);
  const nextIdx = curIdx + 1; // current_step_id nulo → curIdx -1 → começa na 1ª (legado)
  if (nextIdx >= sorted.length) return { kind: "complete", progress: 100 };
  return { kind: "advance", stepId: sorted[nextIdx]!.id, progress: Math.round((nextIdx / sorted.length) * 100) };
}
