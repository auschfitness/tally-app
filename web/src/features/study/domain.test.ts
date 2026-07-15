import { describe, it, expect } from "vitest";
import { filterSermons, sortSermonsByDate, SECTIONS, OPTIONAL_SECTIONS, STATUS_BAND } from "./domain";
import type { Sermon } from "./types";

function sermon(o: Partial<Sermon>): Sermon {
  return {
    id: o.id ?? "s",
    title: o.title ?? "Sermão",
    subtitle: o.subtitle ?? "",
    description: o.description ?? "",
    campus: o.campus ?? "Sede",
    sermon_date: o.sermon_date ?? "",
    series_id: o.series_id ?? null,
    service_id: o.service_id ?? null,
    status: o.status ?? "draft",
    visibility: o.visibility ?? "church",
    main_passage: o.main_passage ?? "",
    big_idea: o.big_idea ?? "",
    content: o.content ?? {},
  };
}

describe("SECTIONS (glossário PT-BR fixado)", () => {
  it("tem as 5 seções com os rótulos corretos", () => {
    expect(SECTIONS.map((s) => s.label)).toEqual(["Esboço", "Notas", "Ilustrações", "Aplicação", "Resposta de oração"]);
  });
  it("opcionais = tudo menos o corpo 'notes'", () => {
    expect(OPTIONAL_SECTIONS.map((s) => s.key)).toEqual(["outline", "illustrations", "application", "prayer_response"]);
  });
});

describe("filterSermons", () => {
  const list = [
    sermon({ id: "a", status: "draft", campus: "Sede", series_id: "x" }),
    sermon({ id: "b", status: "ready", campus: "Sede", series_id: null }),
    sermon({ id: "c", status: "ready", campus: "Zona Sul", series_id: "y" }),
  ];
  it("filtra por status e campus", () => {
    expect(filterSermons(list, { status: "ready", campus: "Sede", series: null }).map((s) => s.id)).toEqual(["b"]);
  });
  it("série '__none__' pega sem série", () => {
    expect(filterSermons(list, { status: null, campus: null, series: "__none__" }).map((s) => s.id)).toEqual(["b"]);
  });
  it("série por id", () => {
    expect(filterSermons(list, { status: null, campus: null, series: "x" }).map((s) => s.id)).toEqual(["a"]);
  });
  it("sem filtros devolve tudo", () => {
    expect(filterSermons(list, { status: null, campus: null, series: null })).toHaveLength(3);
  });
});

describe("sortSermonsByDate", () => {
  it("desc por data, sem data ao fim, sem mutar", () => {
    const list = [sermon({ id: "a", sermon_date: "2026-01-10" }), sermon({ id: "b", sermon_date: "" }), sermon({ id: "c", sermon_date: "2026-05-20" })];
    expect(sortSermonsByDate(list).map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(list.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("asc inverte a ordem das datas", () => {
    const list = [sermon({ id: "a", sermon_date: "2026-01-10" }), sermon({ id: "c", sermon_date: "2026-05-20" })];
    expect(sortSermonsByDate(list, "asc").map((s) => s.id)).toEqual(["a", "c"]);
  });
});

describe("STATUS_BAND", () => {
  it("pregado/pronto = healthy; arquivado = risk", () => {
    expect(STATUS_BAND.preached).toBe("healthy");
    expect(STATUS_BAND.ready).toBe("healthy");
    expect(STATUS_BAND.archived).toBe("risk");
    expect(STATUS_BAND.draft).toBe("attention");
  });
});
