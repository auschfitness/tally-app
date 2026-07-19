import { describe, it, expect } from "vitest";
import { bandOf, groupsHealth, type Group } from "./domain";
import type { Person } from "@/features/sticks/types";

function person(p: Partial<Person>): Person {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    name: p.name ?? "X",
    relationship: p.relationship ?? "member",
    isLeader: p.isLeader ?? false,
    campus: p.campus ?? "Sede",
    lastSeen: p.lastSeen ?? new Date().toISOString().slice(0, 10),
    followup: p.followup ?? false,
    firstVisit: null,
    source: null,
    birthDate: null,
    journeyStage: "connected",
    group: p.group ?? "",
    email: null,
    userId: null,
  };
}

function group(name: string): Group {
  return { id: name, name, campus: "Sede", leader: "", day: "", time: "", newMembers: 0, leftRecently: 0 };
}

describe("bandOf", () => {
  it("grupo vazio = atenção", () => expect(bandOf(0, 0)).toBe("attention"));
  it(">=85% = saudável", () => expect(bandOf(10, 90)).toBe("healthy"));
  it("70-84% = atenção", () => expect(bandOf(10, 75)).toBe("attention"));
  it("<70% = risco", () => expect(bandOf(10, 50)).toBe("risk"));
});

describe("groupsHealth (paridade com derived.js)", () => {
  it("calcula taxa 'em dia' e faixa por grupo do campus ativo", () => {
    const people = [
      person({ name: "A", group: "G1", lastSeen: new Date().toISOString().slice(0, 10) }), // em dia
      person({ name: "B", group: "G1", followup: true }), // 1 motivo
      person({ name: "C", group: "G2", followup: false, lastSeen: new Date().toISOString().slice(0, 10) }),
    ];
    const health = groupsHealth(people, [group("G1"), group("G2")], "Sede");
    const g1 = health.find((g) => g.name === "G1")!;
    expect(g1.count).toBe(2);
    expect(g1.acc).toBe(1);
    expect(g1.rate).toBe(50);
    expect(g1.band).toBe("risk");
  });

  it("ignora grupos de outro campus e ordena por menor taxa primeiro", () => {
    const g1 = group("G1"); // Sede, saudável
    const g2 = group("G2"); // Sede, risco
    const people = [
      person({ name: "A", group: "G1" }),
      person({ name: "B", group: "G2", followup: true }),
    ];
    const health = groupsHealth(people, [g1, g2], "Sede");
    expect(health[0]!.name).toBe("G2"); // menor taxa primeiro
  });
});
