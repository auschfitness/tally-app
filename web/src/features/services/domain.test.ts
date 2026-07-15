import { describe, it, expect } from "vitest";
import { whenLabel, sortServices, composition, trendBars, WD } from "./domain";
import type { Service } from "./types";

function svc(o: Partial<Service>): Service {
  return {
    id: o.id ?? "s",
    name: o.name ?? "Culto",
    type: o.type ?? "",
    campus: o.campus ?? "Sede",
    weekday: o.weekday ?? null,
    start_time: o.start_time ?? "",
    end_time: o.end_time ?? "",
    location: o.location ?? "",
    recurring_pattern: o.recurring_pattern ?? "weekly",
    description: o.description ?? "",
    active: o.active ?? true,
  };
}

describe("whenLabel", () => {
  it("compõe dia + faixa de horário", () => {
    expect(whenLabel({ weekday: 0, start_time: "09:00", end_time: "10:30" })).toBe("Domingo · 09:00–10:30");
  });
  it("só dia, ou só início, ou fallback", () => {
    expect(whenLabel({ weekday: 3, start_time: "", end_time: "" })).toBe("Quarta");
    expect(whenLabel({ weekday: null, start_time: "20:00", end_time: "" })).toBe("20:00");
    expect(whenLabel({ weekday: null, start_time: "", end_time: "" })).toBe("sem horário definido");
  });
  it("cobre todos os dias da semana", () => {
    expect(WD).toHaveLength(7);
    expect(whenLabel({ weekday: 6, start_time: "", end_time: "" })).toBe("Sábado");
  });
});

describe("sortServices", () => {
  it("ordena por dia (sem dia ao fim) e por horário", () => {
    const list = [
      svc({ id: "a", weekday: null, start_time: "10:00" }),
      svc({ id: "b", weekday: 0, start_time: "18:00" }),
      svc({ id: "c", weekday: 0, start_time: "09:00" }),
      svc({ id: "d", weekday: 3, start_time: "20:00" }),
    ];
    expect(sortServices(list).map((s) => s.id)).toEqual(["c", "b", "d", "a"]);
  });
  it("não muta o array original", () => {
    const list = [svc({ id: "a", weekday: 2 }), svc({ id: "b", weekday: 1 })];
    sortServices(list);
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("composition", () => {
  it("conta total, visitantes (1ª/retorno) e crianças (<12)", () => {
    const c = composition([
      { relationship: "member", age: 40 },
      { relationship: "visitor_first", age: 25 },
      { relationship: "visitor_returning", age: 8 },
      { relationship: "member", age: null },
      { relationship: "attendee", age: 5 },
    ]);
    expect(c.total).toBe(5);
    expect(c.visitors).toBe(2);
    expect(c.first).toBe(1);
    expect(c.returning).toBe(1);
    expect(c.kids).toBe(2); // idade 8 e 5
  });
});

describe("trendBars", () => {
  it("pega as últimas n e escala a maior para ~80px", () => {
    const sessions = [
      { date: "2026-01-01", count: 10 },
      { date: "2026-01-08", count: 20 },
      { date: "2026-01-15", count: 5 },
    ];
    const bars = trendBars(sessions, 2);
    expect(bars).toHaveLength(2);
    expect(bars[0]!.count).toBe(20);
    expect(bars[0]!.height).toBe(80); // maior: 78+2
    expect(bars[1]!.height).toBeLessThan(80);
  });
  it("lista vazia não quebra", () => {
    expect(trendBars([], 12)).toEqual([]);
  });
});
