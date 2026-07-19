import { describe, it, expect } from "vitest";
import { journeyStats, journeyFunnel, journeyMovement, firstVisitDrop } from "./domain";
import type { Person } from "@/features/sticks/types";

function person(stage: string, id: string): Person {
  return {
    id, name: id, relationship: "member", isLeader: false, campus: "Sede",
    lastSeen: "2026-07-01", followup: false, firstVisit: null, source: null,
    birthDate: null, journeyStage: stage, group: "", email: null, userId: null,
  };
}

describe("journeyStats", () => {
  it("conta por estágio e calcula parados (≥30 dias)", () => {
    const people = [person("first_visit", "a"), person("first_visit", "b"), person("connected", "c")];
    const entered = new Map([["a", "2026-01-01"], ["c", "2026-07-10"]]); // 'a' há muito, 'c' recente
    const now = new Date(2026, 6, 15);
    const stats = journeyStats(people, entered, now);
    const fv = stats.find((s) => s.code === "first_visit")!;
    expect(fv.count).toBe(2);
    expect(fv.stuck).toBe(1); // só 'a' tem registro e está parado; 'b' sem registro não conta
  });
});

describe("journeyFunnel (cumulativo, monotônico)", () => {
  it("cada estágio soma os posteriores; drop vs anterior", () => {
    const now = new Date(2026, 6, 15);
    const stats = journeyStats(
      [person("first_visit", "a"), person("connected", "b"), person("connected", "c")],
      new Map(), now,
    );
    const funnel = journeyFunnel(stats);
    // 'reached' do primeiro estágio = total (3), do 'connected' = 2.
    expect(funnel[0]!.reached).toBe(3);
    expect(funnel.find((f) => f.label === "Conectado")!.reached).toBe(2);
  });
});

describe("journeyMovement", () => {
  it("agrupa eventos por mês nos últimos N meses", () => {
    const now = new Date(2026, 6, 15);
    const m = journeyMovement(["2026-07-03", "2026-07-20", "2026-06-01"], 6, now);
    expect(m[m.length - 1]!.count).toBe(2); // jul
    expect(m[m.length - 2]!.count).toBe(1); // jun
  });
});

describe("firstVisitDrop", () => {
  it("came = com first_visit; returned = também com second_visit", () => {
    const codes = new Map([
      ["a", new Set(["first_visit", "second_visit"])],
      ["b", new Set(["first_visit"])],
      ["c", new Set(["baptism"])],
    ]);
    const r = firstVisitDrop(codes);
    expect(r.came).toBe(2);
    expect(r.returned).toBe(1);
    expect(r.lost).toBe(1);
  });
});
