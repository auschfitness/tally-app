import { describe, it, expect } from "vitest";
import { occurrences, groupByDay, periodLabel, startOfWeek, addDays, ymd } from "./domain";
import type { CalAssignment, CalEvent, CalService, CalendarSources } from "./types";

function sources(o: Partial<CalendarSources>): CalendarSources {
  return { services: o.services ?? [], events: o.events ?? [], assignments: o.assignments ?? [] };
}
function svc(o: Partial<CalService>): CalService {
  return { id: o.id ?? "s", name: o.name ?? "Culto", weekday: o.weekday ?? null, campus: o.campus ?? "Sede", start_time: o.start_time ?? "", type: o.type ?? "", recurring_pattern: o.recurring_pattern ?? "weekly", active: o.active ?? true };
}
function ev(o: Partial<CalEvent>): CalEvent {
  return { id: o.id ?? "e", name: o.name ?? "Evento", event_date: o.event_date ?? "", campus: o.campus ?? "Sede", start_time: o.start_time ?? "", type: o.type ?? "" };
}
function asg(o: Partial<CalAssignment>): CalAssignment {
  return { id: o.id ?? "a", assignment_date: o.assignment_date ?? "", teamName: o.teamName ?? "Louvor", role: o.role ?? "", personName: o.personName ?? "" };
}

// Janela fixa: 2026-07-01 (qua) a 2026-07-31 (sex).
const FROM = new Date(2026, 6, 1);
const TO = new Date(2026, 6, 31);

describe("occurrences — eventos", () => {
  it("inclui evento dentro do range e no campus; ignora fora do range", () => {
    const src = sources({ events: [ev({ id: "e1", event_date: "2026-07-10", name: "Retiro", start_time: "09:00", type: "Retiro" }), ev({ id: "e2", event_date: "2026-08-05" })] });
    const out = occurrences(FROM, TO, src, "Sede", null);
    expect(out.map((x) => x.ref)).toEqual(["e1"]);
    expect(out[0]!.kind).toBe("event");
    expect(out[0]!.sub).toBe("09:00 · Retiro");
  });
  it("ignora evento de outro campus", () => {
    const src = sources({ events: [ev({ id: "e1", event_date: "2026-07-10", campus: "Zona Sul" })] });
    expect(occurrences(FROM, TO, src, "Sede", null)).toHaveLength(0);
  });
});

describe("occurrences — cultos (recorrência)", () => {
  it("weekly projeta em todos os domingos do range", () => {
    const src = sources({ services: [svc({ id: "s1", name: "Domingo", weekday: 0, recurring_pattern: "weekly" })] });
    const out = occurrences(FROM, TO, src, "Sede", null);
    // domingos de julho/2026: 05, 12, 19, 26
    expect(out.map((x) => x.date)).toEqual(["2026-07-05", "2026-07-12", "2026-07-19", "2026-07-26"]);
    expect(out.every((x) => x.kind === "service")).toBe(true);
  });
  it("monthly projeta só a 1ª ocorrência do weekday no mês", () => {
    const src = sources({ services: [svc({ id: "s1", weekday: 3, recurring_pattern: "monthly" })] }); // quarta
    const out = occurrences(FROM, TO, src, "Sede", null);
    expect(out.map((x) => x.date)).toEqual(["2026-07-01"]); // 1ª quarta de julho
  });
  it("custom não é projetado; inativo não entra", () => {
    const src = sources({ services: [svc({ id: "s1", weekday: 0, recurring_pattern: "custom" }), svc({ id: "s2", weekday: 0, active: false })] });
    expect(occurrences(FROM, TO, src, "Sede", null)).toHaveLength(0);
  });
});

describe("occurrences — escala + filtro + ordenação", () => {
  it("assignment entra pela data; sub junta papel e pessoa", () => {
    const src = sources({ assignments: [asg({ id: "a1", assignment_date: "2026-07-10", teamName: "Som", role: "Mesa", personName: "Ana" })] });
    const out = occurrences(FROM, TO, src, "Sede", null);
    expect(out[0]!.kind).toBe("assignment");
    expect(out[0]!.title).toBe("Som");
    expect(out[0]!.sub).toBe("Mesa · Ana");
  });
  it("filtro por tipo isola a fonte", () => {
    const src = sources({
      events: [ev({ id: "e1", event_date: "2026-07-10" })],
      services: [svc({ id: "s1", weekday: 0 })],
      assignments: [asg({ id: "a1", assignment_date: "2026-07-10" })],
    });
    expect(occurrences(FROM, TO, src, "Sede", "event").every((x) => x.kind === "event")).toBe(true);
    expect(occurrences(FROM, TO, src, "Sede", "service").every((x) => x.kind === "service")).toBe(true);
    expect(occurrences(FROM, TO, src, "Sede", "assignment").every((x) => x.kind === "assignment")).toBe(true);
  });
  it("ordena por data e agrupa por dia", () => {
    const src = sources({
      events: [ev({ id: "e1", event_date: "2026-07-20", name: "B" })],
      assignments: [asg({ id: "a1", assignment_date: "2026-07-10", teamName: "A" })],
    });
    const out = occurrences(FROM, TO, src, "Sede", null);
    expect(out.map((x) => x.date)).toEqual(["2026-07-10", "2026-07-20"]);
    const grouped = groupByDay(out);
    expect([...grouped.keys()]).toEqual(["2026-07-10", "2026-07-20"]);
  });
});

describe("periodLabel", () => {
  it("mês mostra nome+ano; semana mostra faixa dd/mm", () => {
    expect(periodLabel(new Date(2026, 6, 15), "month")).toBe("Julho 2026");
    const ws = startOfWeek(new Date(2026, 6, 15)); // domingo 12/07
    expect(periodLabel(new Date(2026, 6, 15), "week")).toBe("12/07 – " + ymd(addDays(ws, 6)).split("-").reverse().join("/").slice(0, 5));
  });
});
