import { describe, it, expect } from "vitest";
import {
  peopleSignals,
  groupHealthSignals,
  taskSignals,
  serviceSignals,
  serviceEventSignals,
  signals,
  activeSignals,
  signalsFor,
  sigStatus,
  type SignalPerson,
  type Milestone,
  type Session,
  type Team,
  type TeamMember,
  type ScheduleAssignment,
  type Service,
  type ChurchEvent,
  type SignalsInput,
} from "./domain";
import type { GroupHealth } from "@/features/groups/domain";

// `now` fixo em UTC-meio-dia: isoDate estável em qualquer fuso do runner.
const NOW = new Date("2026-07-15T12:00:00Z");
const NOW_ISO = "2026-07-15";

function daysAgoIso(n: number): string {
  return new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10);
}

function person(p: Partial<SignalPerson>): SignalPerson {
  return {
    id: p.id ?? "p1",
    name: p.name ?? "X",
    relationship: p.relationship ?? "member",
    campus: p.campus ?? "Sede",
    lastSeen: p.lastSeen ?? NOW_ISO,
    group: p.group ?? "",
    followup: p.followup ?? false,
  };
}

function health(g: Partial<GroupHealth>): GroupHealth {
  return {
    id: g.id ?? g.name ?? "G",
    name: g.name ?? "G",
    leader: g.leader ?? "",
    count: g.count ?? 0,
    acc: g.acc ?? 0,
    rate: g.rate ?? 0,
    band: g.band ?? "healthy",
    newMembers: g.newMembers ?? 0,
    leftRecently: g.leftRecently ?? 0,
    noLeader: g.noLeader ?? false,
  };
}

describe("peopleSignals", () => {
  it("gera atenção (≥3 semanas) e concatena 'sem grupo' e 'follow-up' no porquê", () => {
    const p = person({ id: "a", name: "Ruth", lastSeen: daysAgoIso(28), group: "", followup: true });
    const out = peopleSignals([p], new Map(), "Sede", NOW);
    const s = out.find((x) => x.key === "att-a")!;
    expect(s.level).toBe("attention");
    expect(s.category).toBe("Care");
    expect(s.title).toBe("Ruth pode precisar de atenção");
    expect(s.why).toEqual(["Sem aparecer há 4 semanas", "Não está em um grupo", "Follow-up em aberto"]);
  });

  it("visitante sem grupo (e visto recentemente) vira notice de Journey", () => {
    const p = person({ id: "b", name: "Ana", relationship: "visitor_first", group: "", lastSeen: NOW_ISO });
    const out = peopleSignals([p], new Map(), "Sede", NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.key).toBe("grp-b");
    expect(out[0]!.category).toBe("Journey");
    expect(out[0]!.level).toBe("notice");
  });

  it("membro recente com follow-up vira atenção de Care (fu-)", () => {
    const p = person({ id: "c", name: "João", group: "G1", followup: true, lastSeen: NOW_ISO });
    const out = peopleSignals([p], new Map(), "Sede", NOW);
    expect(out.map((x) => x.key)).toEqual(["fu-c"]);
    expect(out[0]!.type).toBe("care");
  });

  it("milestone dos últimos 21 dias vira celebração (independe do ramo acima)", () => {
    const p = person({ id: "d", name: "Bia", lastSeen: NOW_ISO, group: "G1" });
    const ms = new Map<string, Milestone[]>([["d", [{ type: "baptism", date: daysAgoIso(5) }]]]);
    const out = peopleSignals([p], ms, "Sede", NOW);
    const s = out.find((x) => x.type === "milestone")!;
    expect(s.level).toBe("celebration");
    expect(s.title).toBe("Bia · Batismo");
    expect(s.date).toBe(daysAgoIso(5));
  });

  it("milestone com mais de 21 dias é ignorado", () => {
    const p = person({ id: "e", lastSeen: NOW_ISO, group: "G1" });
    const ms = new Map<string, Milestone[]>([["e", [{ type: "baptism", date: daysAgoIso(40) }]]]);
    expect(peopleSignals([p], ms, "Sede", NOW).some((x) => x.type === "milestone")).toBe(false);
  });

  it("ignora pessoas de outro campus", () => {
    const p = person({ id: "f", campus: "Zona Sul", followup: true, lastSeen: NOW_ISO });
    expect(peopleSignals([p], new Map(), "Sede", NOW)).toHaveLength(0);
  });
});

describe("groupHealthSignals", () => {
  it("banda 'risk' gera saúde baixa com a taxa no porquê", () => {
    const out = groupHealthSignals([health({ name: "Alpha", band: "risk", rate: 40 })], [], NOW);
    const s = out.find((x) => x.key === "gh-Alpha")!;
    expect(s.why).toEqual(["40% dos membros em dia"]);
  });

  it("sem líder, crescimento e saídas geram sinais próprios com plural correto", () => {
    const out = groupHealthSignals(
      [health({ name: "Beta", noLeader: true, newMembers: 2, leftRecently: 1 })],
      [],
      NOW,
    );
    expect(out.find((x) => x.key === "gl-Beta")!.level).toBe("notice");
    expect(out.find((x) => x.key === "gn-Beta")!.title).toBe("Grupo Beta recebeu 2 novos membros");
    expect(out.find((x) => x.key === "gx-Beta")!.title).toBe("Grupo Beta: 1 saída recente");
  });

  it("presença: só sinaliza grupo que já registrou e parou (>21 dias)", () => {
    const stale: Session[] = [{ group: "Gamma", date: daysAgoIso(30), attendees: [] }];
    const recent: Session[] = [{ group: "Delta", date: daysAgoIso(10), attendees: [] }];
    const g = [health({ name: "Gamma" }), health({ name: "Delta" }), health({ name: "Sem" })];
    const out = groupHealthSignals(g, [...stale, ...recent], NOW);
    expect(out.some((x) => x.key === "ga-Gamma")).toBe(true);
    expect(out.some((x) => x.key === "ga-Delta")).toBe(false); // recente
    expect(out.some((x) => x.key === "ga-Sem")).toBe(false); // nunca registrou
  });
});

describe("taskSignals", () => {
  it("ignora concluídas/sem responsável e monta título com o nome", () => {
    const out = taskSignals(
      [
        { id: "1", done: false, who: "Pedro", text: "levar o som" },
        { id: "2", done: true, who: "Ana", text: "x" },
        { id: "3", done: false, who: "", text: "y" },
      ],
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("Pedro foi designado: levar o som");
    expect(out[0]!.stickName).toBe("Pedro");
  });
});

describe("serviceSignals (times/escala)", () => {
  const activeTeam = (o: Partial<Team>): Team => ({ id: "t", name: "Louvor", status: "active", campus: "Sede", leader_id: "L", ...o });
  const member = (o: Partial<TeamMember>): TeamMember => ({ id: "m", team_id: "t", stick_id: "s", status: "active", joined_at: null, ...o });

  it("time vazio e time sem líder", () => {
    const out = serviceSignals([], [activeTeam({ id: "t1", name: "Kids", leader_id: null })], [], [], "Sede", NOW);
    expect(out.some((x) => x.key === "tm-empty-t1")).toBe(true);
    expect(out.some((x) => x.key === "tm-noleader-t1")).toBe(true);
  });

  it("time com poucas pessoas (≤3)", () => {
    const tm = [member({ id: "m1", team_id: "t2", stick_id: "a" }), member({ id: "m2", team_id: "t2", stick_id: "b" })];
    const out = serviceSignals([], [activeTeam({ id: "t2", name: "Recepção" })], tm, [], "Sede", NOW);
    expect(out.find((x) => x.key === "tm-few-t2")!.why[0]).toBe("2 pessoas servindo");
  });

  it("conectados que ainda não servem viram oportunidade", () => {
    const people = [person({ id: "a", group: "G1" }), person({ id: "b", group: "G1" })];
    const out = serviceSignals(people, [], [], [], "Sede", NOW);
    const s = out.find((x) => x.key === "tm-connns")!;
    expect(s.title).toBe("2 pessoas conectadas ainda não servem");
  });

  it("começou a servir (joined_at recente) e cuidado por streak longo", () => {
    const people = [person({ id: "a", name: "Léo", group: "G1" })];
    const tm = [member({ id: "m1", stick_id: "a", joined_at: daysAgoIso(3) })];
    const team = activeTeam({ id: "t", name: "Som" });
    const dates: string[] = [];
    for (let i = 0; i < 12; i++) dates.push(daysAgoIso(i * 7));
    const sched: ScheduleAssignment[] = dates.map((d) => ({ stick_id: "a", assignment_date: d, status: "confirmed" }));
    const out = serviceSignals(people, [team], tm, sched, "Sede", NOW);
    expect(out.find((x) => x.key === "tm-start-m1")!.title).toBe("Léo começou a servir em Som");
    const care = out.find((x) => x.key === "tm-streak-a")!;
    expect(care.category).toBe("Care");
    expect(care.title).toMatch(/^Léo serve há \d+ semanas seguidas$/);
  });
});

describe("serviceEventSignals (cultos/eventos)", () => {
  const svc: Service = { id: "s1", name: "Culto Domingo", active: true, campus: "Sede" };

  it("queda de presença e recorde a partir de ≥3 sessões", () => {
    const drop: Session[] = [
      { service: "s1", date: daysAgoIso(21), attendees: Array(100).fill("x") },
      { service: "s1", date: daysAgoIso(14), attendees: Array(100).fill("x") },
      { service: "s1", date: daysAgoIso(7), attendees: Array(50).fill("x") },
    ];
    const out = serviceEventSignals([svc], drop, [], [], [], [], "Sede", NOW);
    expect(out.some((x) => x.key === "svc-drop-s1")).toBe(true);
    expect(out.some((x) => x.type === "service_attendance" && x.level === "celebration")).toBe(false);
  });

  it("visitantes no último culto viram oportunidade de follow-up", () => {
    const sess: Session[] = [{ service: "s1", date: daysAgoIso(2), attendees: ["v1", "m1"] }];
    const people = [person({ id: "v1", relationship: "visitor_first" }), person({ id: "m1", relationship: "member" })];
    const out = serviceEventSignals([svc], sess, [], [], [], people, "Sede", NOW);
    const s = out.find((x) => x.type === "service_visitor")!;
    expect(s.title).toBe("1 visitante no último Culto Domingo");
  });

  it("escala futura sem cobertura", () => {
    const sched: ScheduleAssignment[] = [{ stick_id: "a", assignment_date: daysAgoIso(-3), status: "replacement_needed" }];
    const out = serviceEventSignals([], [], sched, [], [], [], "Sede", NOW);
    expect(out.find((x) => x.key === "svc-cover")!.title).toBe("1 escalação sem cobertura");
  });

  it("evento ativo nos próximos 14 dias com contagem de inscritos", () => {
    const ev: ChurchEvent = { id: "e1", name: "Retiro", status: "active", event_date: daysAgoIso(-5), campus: "Sede", capacity: 50 };
    const out = serviceEventSignals([], [], [], [ev], [{ event_id: "e1" }, { event_id: "e1" }], [], "Sede", NOW);
    const s = out.find((x) => x.key === "evt-soon-e1")!;
    expect(s.title).toBe("Retiro em 5 dias");
    expect(s.why[0]).toBe("2 inscritos de 50");
  });
});

describe("signals (composição) + overrides", () => {
  function input(over: Partial<SignalsInput>): SignalsInput {
    return {
      people: over.people ?? [],
      milestonesByStick: over.milestonesByStick ?? new Map(),
      groupsHealth: over.groupsHealth ?? [],
      sessions: over.sessions ?? [],
      tasks: over.tasks ?? [],
      teams: over.teams ?? [],
      teamMembers: over.teamMembers ?? [],
      schedule: over.schedule ?? [],
      services: over.services ?? [],
      events: over.events ?? [],
      eventRegs: over.eventRegs ?? [],
      activeCampus: over.activeCampus ?? "Sede",
    };
  }

  it("agrega pessoas + grupos + tarefas + serviço numa única lista", () => {
    const all = signals(
      input({
        people: [person({ id: "a", lastSeen: daysAgoIso(28), group: "", followup: false })],
        groupsHealth: [health({ name: "Alpha", band: "risk", rate: 30 })],
        tasks: [{ id: "1", done: false, who: "Ana", text: "abrir a sala" }],
      }),
      NOW,
    );
    expect(all.some((s) => s.key === "att-a")).toBe(true);
    expect(all.some((s) => s.key === "gh-Alpha")).toBe(true);
    expect(all.some((s) => s.key === "task-1")).toBe(true);
  });

  it("activeSignals oculta dismissed; signalsFor filtra por Stick", () => {
    const all = signals(input({ people: [person({ id: "a", lastSeen: daysAgoIso(28), followup: true })] }), NOW);
    const overrides = { "att-a": { status: "dismissed" as const } };
    expect(sigStatus(overrides, "att-a")).toBe("dismissed");
    expect(activeSignals(all, overrides).some((s) => s.key === "att-a")).toBe(false);
    expect(signalsFor(all, {}, "a").every((s) => s.stickId === "a")).toBe(true);
  });
});
