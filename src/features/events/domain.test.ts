import { describe, it, expect } from "vitest";
import { whenLabel, capacityLabel, tsFrom, timeOf, sortEvents, STATUS_BAND } from "./domain";
import type { EventItem } from "./types";

function ev(o: Partial<EventItem>): EventItem {
  return {
    id: o.id ?? "e",
    name: o.name ?? "Evento",
    type: o.type ?? "",
    description: o.description ?? "",
    campus: o.campus ?? "Sede",
    event_date: o.event_date ?? "",
    start_time: o.start_time ?? "",
    end_time: o.end_time ?? "",
    location: o.location ?? "",
    capacity: o.capacity ?? null,
    registration_required: o.registration_required ?? true,
    payment_required: o.payment_required ?? false,
    check_in_enabled: o.check_in_enabled ?? true,
    status: o.status ?? "active",
    cover_image: o.cover_image ?? "",
  };
}

describe("whenLabel", () => {
  it("data + faixa de horário", () => {
    expect(whenLabel({ event_date: "2026-07-14", start_time: "09:00", end_time: "12:00" })).toBe("14/07/2026 · 09:00–12:00");
  });
  it("só data, ou fallback", () => {
    expect(whenLabel({ event_date: "2026-07-14", start_time: "", end_time: "" })).toBe("14/07/2026");
    expect(whenLabel({ event_date: "", start_time: "", end_time: "" })).toBe("sem data definida");
  });
});

describe("capacityLabel", () => {
  it("com capacidade mostra n/cap", () => expect(capacityLabel(3, 50)).toBe(" · 3/50"));
  it("sem capacidade mostra contagem", () => {
    expect(capacityLabel(3, null)).toBe(" · 3 inscritos");
    expect(capacityLabel(1, null)).toBe(" · 1 inscrito");
    expect(capacityLabel(0, null)).toBe("");
  });
});

describe("tsFrom / timeOf (round-trip HH:MM ↔ timestamptz)", () => {
  it("tsFrom monta ISO local; sem os dois → null", () => {
    expect(tsFrom("2026-07-14", "09:00")).toBe("2026-07-14T09:00:00");
    expect(tsFrom("2026-07-14", "")).toBeNull();
    expect(tsFrom("", "09:00")).toBeNull();
  });
  it("timeOf extrai HH:MM de qualquer timestamptz", () => {
    expect(timeOf("2026-07-14T09:00:00+00:00")).toBe("09:00");
    expect(timeOf("2026-07-14T21:30:00")).toBe("21:30");
    expect(timeOf(null)).toBe("");
    expect(timeOf("")).toBe("");
  });
});

describe("sortEvents", () => {
  it("data decrescente, sem data ao fim, sem mutar", () => {
    const list = [
      ev({ id: "a", event_date: "2026-01-10" }),
      ev({ id: "b", event_date: "" }),
      ev({ id: "c", event_date: "2026-05-20" }),
    ];
    expect(sortEvents(list).map((e) => e.id)).toEqual(["c", "a", "b"]);
    expect(list.map((e) => e.id)).toEqual(["a", "b", "c"]); // original intacto
  });
});

describe("STATUS_BAND", () => {
  it("mapeia status para faixa visual", () => {
    expect(STATUS_BAND.active).toBe("healthy");
    expect(STATUS_BAND.cancelled).toBe("risk");
    expect(STATUS_BAND.draft).toBe("attention");
  });
});
