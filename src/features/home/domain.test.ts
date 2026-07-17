import { describe, it, expect } from "vitest";
import { careLevel, riskDist, flaggedPeople, weeklyAttendance, communityInsights, homeVisibleSignals, celebrations, todayCounts } from "./domain";
import type { Session, Signal, SignalPerson } from "@/features/signals/domain";
import type { GroupHealth } from "@/features/groups/domain";

function person(o: Partial<SignalPerson> & { id: string }): SignalPerson {
  return {
    id: o.id,
    name: o.name ?? o.id,
    relationship: o.relationship ?? "member",
    campus: o.campus ?? "Sede",
    lastSeen: o.lastSeen ?? "2026-07-14", // recente → em dia
    group: o.group ?? "GA",
    followup: o.followup ?? false,
  };
}
function sig(o: Partial<Signal> & { key: string }): Signal {
  return { key: o.key, type: "t", level: o.level ?? "notice", title: o.title ?? "T", why: o.why ?? [], date: o.date ?? "2026-07-14", category: o.category ?? "Journey", stickId: o.stickId, stickName: o.stickName };
}
const NOW = new Date("2026-07-15T00:00:00Z");

describe("careLevel", () => {
  it("0=em, 1=at, ≥2=ri", () => {
    expect(careLevel(0)).toBe("em");
    expect(careLevel(1)).toBe("at");
    expect(careLevel(3)).toBe("ri");
  });
});

describe("riskDist", () => {
  it("distribui por nível só no campus ativo", () => {
    const people = [
      person({ id: "a" }), // em dia
      person({ id: "b", group: "" }), // 1 motivo → atenção
      person({ id: "c", group: "", followup: true, lastSeen: "2026-01-01" }), // 3 motivos → risco
      person({ id: "d", campus: "Outro", group: "" }), // fora do campus
    ];
    expect(riskDist(people, "Sede")).toEqual({ em: 1, at: 1, ri: 1, total: 3 });
  });
});

describe("flaggedPeople", () => {
  it("só sinalizados, mais motivos primeiro", () => {
    const people = [
      person({ id: "ok" }),
      person({ id: "one", group: "" }),
      person({ id: "three", group: "", followup: true, lastSeen: "2026-01-01" }),
    ];
    const f = flaggedPeople(people, "Sede");
    expect(f.map((x) => x.id)).toEqual(["three", "one"]);
    expect(f[0]!.reasons.length).toBeGreaterThanOrEqual(f[1]!.reasons.length);
  });
});

describe("weeklyAttendance (dado REAL, nunca sintético)", () => {
  it("soma presentes de sessões de célula por semana; cultos são ignorados", () => {
    const sessions: Session[] = [
      { service: null, group: "GA", date: "2026-07-13", attendees: ["a", "b", "c"] }, // esta semana
      { service: null, group: "GA", date: "2026-07-06", attendees: ["a", "b"] }, // semana passada
      { service: "s1", group: null, date: "2026-07-13", attendees: ["x", "y"] }, // culto → ignorado
    ];
    const pts = weeklyAttendance(sessions, NOW, 8);
    expect(pts.length).toBe(8);
    expect(pts[7]!.count).toBe(3); // semana atual
    expect(pts[6]!.count).toBe(2);
    expect(pts.slice(0, 6).every((p) => p.count === 0)).toBe(true);
  });
  it("sem sessões → tudo zero (não inventa)", () => {
    expect(weeklyAttendance([], NOW, 8).every((p) => p.count === 0)).toBe(true);
  });
});

describe("communityInsights", () => {
  it("conta conectados/sem grupo e agrega grupos", () => {
    const people = [person({ id: "a", group: "GA" }), person({ id: "b", group: "" }), person({ id: "c", campus: "Outro", group: "" })];
    const gh: GroupHealth[] = [
      { name: "GA", count: 5, rate: 90, band: "healthy", newMembers: 0, leftRecently: 0, noLeader: false } as GroupHealth,
      { name: "GB", count: 3, rate: 60, band: "risk", newMembers: 2, leftRecently: 0, noLeader: true } as GroupHealth,
    ];
    const ci = communityInsights(people, gh, 4, "Sede");
    expect(ci.total).toBe(2);
    expect(ci.inGroup).toBe(1);
    expect(ci.connRate).toBe(50);
    expect(ci.noGroup.map((p) => p.id)).toEqual(["b"]);
    expect(ci.groupsNoNew).toBe(1);
    expect(ci.groupsNoLeader).toBe(1);
    expect(ci.movement30).toBe(4);
  });
});

describe("homeVisibleSignals / celebrations / todayCounts", () => {
  const all = [
    sig({ key: "c1", level: "celebration", category: "Celebration" }),
    sig({ key: "care1", level: "attention", category: "Care" }),
    sig({ key: "care2", level: "attention", category: "Care" }),
  ];
  it("esconde só dispensados (adiados ainda contam)", () => {
    const ov = new Map([["care2", "dismissed"], ["c1", "snoozed"]]);
    const vis = homeVisibleSignals(all, ov);
    expect(vis.map((s) => s.key).sort()).toEqual(["c1", "care1"]);
  });
  it("celebrations filtra nível e limita", () => {
    expect(celebrations(all).map((s) => s.key)).toEqual(["c1"]);
  });
  it("todayCounts agrega Pulse", () => {
    const gh: GroupHealth[] = [{ name: "GB", band: "risk", newMembers: 0, leftRecently: 0, noLeader: false, count: 3, rate: 60 } as GroupHealth];
    const people = [person({ id: "a", group: "" }), person({ id: "b", group: "GA" })];
    const c = todayCounts(all, gh, people, "Sede", 2);
    expect(c.care).toBe(2);
    expect(c.groupsAtt).toBe(1);
    expect(c.noComm).toBe(1);
    expect(c.celeb).toBe(1);
    expect(c.prayersAnswered).toBe(2);
  });
});
