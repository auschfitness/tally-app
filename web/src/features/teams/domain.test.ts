import { describe, it, expect } from "vitest";
import {
  devStage,
  teamHealth,
  roleDistribution,
  statusCounts,
  leadershipLadder,
  ministryStats,
  nextAssignmentStatus,
  weekStart,
  ddmm,
  addDays,
  parseRoles,
} from "./domain";
import type { Ministry, ScheduleAssignment, Team, TeamMember } from "./types";

const NOW = new Date("2026-07-15T12:00:00Z");
function daysAgoIso(n: number): string {
  return new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10);
}

function team(o: Partial<Team>): Team {
  return { id: "t", ministry_id: null, name: "Louvor", description: "", campus: "Sede", leader_id: null, serving_roles: [], status: "active", ...o };
}
function member(o: Partial<TeamMember>): TeamMember {
  return { id: "m", team_id: "t", stick_id: "s", role: "", status: "active", availability: "", joined_at: "", notes: "", ...o };
}

describe("devStage", () => {
  it("líder vem de teams.leader_id", () => {
    expect(devStage(member({ stick_id: "a" }), team({ leader_id: "a" }), {})).toBe("leader");
  });
  it("demais vêm do leadershipDev (default serving)", () => {
    expect(devStage(member({ id: "m1", stick_id: "b" }), team({ leader_id: "a" }), { m1: "apprentice" })).toBe("apprentice");
    expect(devStage(member({ id: "m2", stick_id: "c" }), team({ leader_id: "a" }), {})).toBe("serving");
  });
});

describe("teamHealth (paridade)", () => {
  it("time vazio = risco; sem líder = atenção; sem escala = muted", () => {
    const obs = teamHealth(team({ leader_id: null }), [], [], NOW);
    expect(obs[0]).toEqual({ band: "risk", text: "Ninguém serve neste time ainda." });
    expect(obs.some((o) => o.band === "attention" && o.text === "Sem líder definido.")).toBe(true);
    expect(obs.some((o) => o.band === "muted")).toBe(true);
  });

  it("papel de serviço sem ninguém é sinalizado", () => {
    const t = team({ leader_id: "L", serving_roles: ["Vocal", "Guitarra"] });
    const mem = [member({ id: "1", stick_id: "a", role: "Vocal" }), member({ id: "2", stick_id: "b", role: "Vocal" }), member({ id: "3", stick_id: "c", role: "Vocal" })];
    const obs = teamHealth(t, mem, [], NOW);
    expect(obs.some((o) => o.text === "Papel sem ninguém: Guitarra.")).toBe(true);
  });

  it("concentração: poucos cobrindo a maioria das escalações = risco", () => {
    const t = team({ id: "t", leader_id: "L" });
    const mem = [member({ id: "1", stick_id: "a" }), member({ id: "2", stick_id: "b" })];
    // a cobre 8, b cobre 1 → 1 pessoa cobre ≥70%, need(1) ≤ ceil(2/2)=1 → risco
    const sched: ScheduleAssignment[] = [];
    for (let i = 0; i < 8; i++) sched.push({ id: "x" + i, service_id: null, event_id: null, team_id: "t", role: "", stick_id: "a", assignment_date: daysAgoIso(i * 3), status: "assigned", confirmed_at: null });
    sched.push({ id: "y", service_id: null, event_id: null, team_id: "t", role: "", stick_id: "b", assignment_date: daysAgoIso(2), status: "assigned", confirmed_at: null });
    const obs = teamHealth(t, mem, sched, NOW);
    expect(obs.some((o) => o.band === "risk" && /depende de poucos/.test(o.text))).toBe(true);
  });
});

describe("roleDistribution / statusCounts", () => {
  it("conta papéis dos ativos e inclui papel definido sem ninguém (count 0)", () => {
    const t = team({ serving_roles: ["Vocal", "Bateria"] });
    const mem = [member({ id: "1", stick_id: "a", role: "Vocal", status: "active" }), member({ id: "2", stick_id: "b", role: "", status: "active" })];
    const dist = roleDistribution(t, mem);
    expect(dist.find((d) => d.role === "Vocal")!.count).toBe(1);
    expect(dist.find((d) => d.role === "Sem papel")!.count).toBe(1);
    expect(dist.find((d) => d.role === "Bateria")!.count).toBe(0);
  });
  it("statusCounts separa servindo/pausa/inativo", () => {
    const mem = [member({ status: "active" }), member({ status: "paused" }), member({ status: "inactive" }), member({ status: "active" })];
    expect(statusCounts(mem)).toEqual({ active: 2, paused: 1, inactive: 1 });
  });
});

describe("leadershipLadder", () => {
  it("agrupa por estágio, ignora inativos, resolve nomes", () => {
    const t = team({ leader_id: "a" });
    const mem = [
      member({ id: "1", stick_id: "a", status: "active" }),
      member({ id: "2", stick_id: "b", status: "active" }),
      member({ id: "3", stick_id: "c", status: "inactive" }),
    ];
    const names: Record<string, string> = { a: "Ana", b: "Bia", c: "Cris" };
    const ladder = leadershipLadder(mem, t, { "2": "apprentice" }, (id) => names[id] ?? "");
    expect(ladder.leader).toEqual(["Ana"]);
    expect(ladder.apprentice).toEqual(["Bia"]);
    expect(ladder.serving).toEqual([]);
    expect(ladder.co_leader).toEqual([]);
  });
});

describe("ministryStats", () => {
  it("conta times, pessoas únicas servindo e times sem líder", () => {
    const min: Ministry = { id: "min", name: "Louvor", description: "", campus: "Sede", leader_id: null, color: "", status: "active" };
    const teams = [team({ id: "t1", ministry_id: "min", leader_id: "L" }), team({ id: "t2", ministry_id: "min", leader_id: null }), team({ id: "t3", ministry_id: "outro" })];
    const membersByTeam = new Map<string, TeamMember[]>([
      ["t1", [member({ id: "1", stick_id: "a", status: "active" }), member({ id: "2", stick_id: "b", status: "active" })]],
      ["t2", [member({ id: "3", stick_id: "a", status: "active" })]], // 'a' repetida → única
    ]);
    const stats = ministryStats(min, teams, membersByTeam);
    expect(stats.teamCount).toBe(2);
    expect(stats.peopleServing).toBe(2); // a, b
    expect(stats.noLeader).toBe(1);
    expect(stats.maxCount).toBe(2);
  });
});

describe("escala: helpers", () => {
  it("nextAssignmentStatus cicla e volta ao início", () => {
    expect(nextAssignmentStatus("assigned")).toBe("confirmed");
    expect(nextAssignmentStatus("completed")).toBe("assigned");
  });
  it("weekStart cai no domingo e ddmm formata", () => {
    const ws = weekStart("2026-07-15"); // quarta
    expect(ws.getDay()).toBe(0);
    expect(ddmm(ws)).toBe("12/07");
    expect(ddmm(addDays(ws, 6))).toBe("18/07");
  });
  it("parseRoles quebra por vírgula e limpa vazios", () => {
    expect(parseRoles("Vocal, Guitarra , , Mesa")).toEqual(["Vocal", "Guitarra", "Mesa"]);
  });
});
