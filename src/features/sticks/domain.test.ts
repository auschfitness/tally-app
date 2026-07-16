import { describe, it, expect } from "vitest";
import {
  careReasons,
  careLevel,
  isVisitor,
  journeyLabel,
  journeyCodeForPosition,
  positionForJourneyCode,
  relLabel,
  relLabelFull,
} from "./domain";

// Helper: data ISO N dias atrás (para exercitar weeksSince de forma determinística).
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("careReasons (paridade com derived.js)", () => {
  it("membro visto hoje, em grupo, sem follow-up → nenhum motivo (em dia)", () => {
    const r = careReasons({ lastSeen: daysAgoIso(0), group: "Célula A", followup: false });
    expect(r).toHaveLength(0);
    expect(careLevel(r.length)).toBe("em");
  });

  it("sem aparecer há 4 semanas → 1 motivo (atenção)", () => {
    const r = careReasons({ lastSeen: daysAgoIso(28), group: "Célula A", followup: false });
    expect(r.map((x) => x.short)).toContain("sem aparecer");
    expect(r).toHaveLength(1);
    expect(careLevel(r.length)).toBe("at");
  });

  it("sem grupo + follow-up aberto → 2 motivos (risco)", () => {
    const r = careReasons({ lastSeen: daysAgoIso(0), group: "", followup: true });
    expect(r.map((x) => x.short).sort()).toEqual(["follow-up", "sem grupo"]);
    expect(careLevel(r.length)).toBe("ri");
  });

  it("respeita o limiar careWeeks custom", () => {
    // 14 dias = 2 semanas: com limiar 3 não conta; com limiar 2 conta.
    expect(careReasons({ lastSeen: daysAgoIso(14), group: "G", followup: false }, 3)).toHaveLength(0);
    expect(careReasons({ lastSeen: daysAgoIso(14), group: "G", followup: false }, 2)).toHaveLength(1);
  });

  it("sem data de última presença → conta como sumido", () => {
    const r = careReasons({ lastSeen: null, group: "G", followup: false });
    expect(r.map((x) => x.short)).toContain("sem aparecer");
  });
});

describe("mapeamento de jornada (position ↔ código)", () => {
  it("position → código", () => {
    expect(journeyCodeForPosition(1)).toBe("first_visit");
    expect(journeyCodeForPosition(3)).toBe("connected");
    expect(journeyCodeForPosition(6)).toBe("leadership");
  });
  it("position ausente → first_visit (fallback seguro)", () => {
    expect(journeyCodeForPosition(null)).toBe("first_visit");
    expect(journeyCodeForPosition(undefined)).toBe("first_visit");
  });
  it("código → position", () => {
    expect(positionForJourneyCode("connected")).toBe(3);
    expect(positionForJourneyCode("leadership")).toBe(6);
    expect(positionForJourneyCode("desconhecido")).toBe(1);
  });
  it("rótulo em PT-BR", () => {
    expect(journeyLabel("group")).toBe("Em grupo");
    expect(journeyLabel("first_visit")).toBe("Primeira visita");
    expect(journeyLabel("xyz")).toBe("—");
  });
});

describe("relação (rótulos e visitante)", () => {
  it("rótulos curto/completo", () => {
    expect(relLabel("member")).toBe("Membro");
    expect(relLabel("visitor_first")).toBe("Visitante");
    expect(relLabelFull("visitor_first")).toBe("Visitante 1a vez");
  });
  it("isVisitor cobre as duas formas de visitante", () => {
    expect(isVisitor("visitor_first")).toBe(true);
    expect(isVisitor("visitor_returning")).toBe(true);
    expect(isVisitor("member")).toBe(false);
    expect(isVisitor("attendee")).toBe(false);
  });
});
