import { describe, it, expect } from "vitest";
import { sortSteps, nextPosition, firstStepId, enrollmentPosition, trackSummary, planAdvance } from "./domain";
import type { Enrollment, Track, TrackStep } from "./types";

function step(o: Partial<TrackStep>): TrackStep {
  return { id: o.id ?? "st", track_id: o.track_id ?? "t", name: o.name ?? "Etapa", description: o.description ?? "", position: o.position ?? 1 };
}
function enr(o: Partial<Enrollment>): Enrollment {
  return {
    id: o.id ?? "e",
    track_id: o.track_id ?? "t",
    stick_id: o.stick_id ?? "p",
    current_step_id: o.current_step_id ?? null,
    progress: o.progress ?? 0,
    status: o.status ?? "in_progress",
    started_at: o.started_at ?? null,
    completed_at: o.completed_at ?? null,
  };
}
// 3 etapas fora de ordem para provar a ordenação por position.
const steps: TrackStep[] = [
  step({ id: "s3", position: 3, name: "Batismo" }),
  step({ id: "s1", position: 1, name: "Boas-vindas" }),
  step({ id: "s2", position: 2, name: "Fundamentos" }),
];

describe("sortSteps / nextPosition / firstStepId", () => {
  it("ordena por position sem mutar o original", () => {
    const copy = steps.slice();
    expect(sortSteps(steps).map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(steps).toEqual(copy);
  });
  it("nextPosition = total + 1", () => {
    expect(nextPosition(steps)).toBe(4);
    expect(nextPosition([])).toBe(1);
  });
  it("firstStepId = 1ª por position, ou null sem etapas", () => {
    expect(firstStepId(steps)).toBe("s1");
    expect(firstStepId([])).toBeNull();
  });
});

describe("enrollmentPosition", () => {
  it("na etapa do meio: pos = índice+1, pct arredondado", () => {
    const p = enrollmentPosition(enr({ current_step_id: "s2" }), steps);
    expect(p).toEqual({ pos: 2, total: 3, pct: 67, completed: false });
  });
  it("concluída ocupa o total (100%)", () => {
    const p = enrollmentPosition(enr({ status: "completed", current_step_id: "s1" }), steps);
    expect(p).toEqual({ pos: 3, total: 3, pct: 100, completed: true });
  });
  it("sem etapa atual conhecida = 0", () => {
    const p = enrollmentPosition(enr({ current_step_id: null }), steps);
    expect(p).toEqual({ pos: 0, total: 3, pct: 0, completed: false });
  });
  it("trilha sem etapas não divide por zero", () => {
    expect(enrollmentPosition(enr({}), [])).toEqual({ pos: 0, total: 0, pct: 0, completed: false });
  });
});

describe("trackSummary", () => {
  const track: Track = { id: "t", name: "Discipulado", description: "", type: "", status: "active", steps };
  it("conta etapas, matriculados e concluídos da trilha", () => {
    const ens = [
      enr({ id: "e1", track_id: "t", status: "in_progress" }),
      enr({ id: "e2", track_id: "t", status: "completed" }),
      enr({ id: "e3", track_id: "outra", status: "completed" }), // outra trilha — ignorada
    ];
    expect(trackSummary(track, ens)).toEqual({ steps: 3, enrolled: 2, completed: 1 });
  });
});

describe("planAdvance", () => {
  it("avança para a próxima etapa com progresso arredondado", () => {
    expect(planAdvance(enr({ current_step_id: "s1" }), steps)).toEqual({ kind: "advance", stepId: "s2", progress: 33 });
  });
  it("da última etapa → conclui (100%)", () => {
    expect(planAdvance(enr({ current_step_id: "s3" }), steps)).toEqual({ kind: "complete", progress: 100 });
  });
  it("current_step_id nulo começa na 1ª etapa", () => {
    expect(planAdvance(enr({ current_step_id: null }), steps)).toEqual({ kind: "advance", stepId: "s1", progress: 0 });
  });
  it("já concluída = noop", () => {
    expect(planAdvance(enr({ status: "completed", current_step_id: "s3" }), steps)).toEqual({ kind: "noop" });
  });
  it("trilha sem etapas = noop", () => {
    expect(planAdvance(enr({}), [])).toEqual({ kind: "noop" });
  });
});
