import { describe, it, expect } from "vitest";
import { BOOKS } from "./books";
import { usfmToOsis, osisToUsfm } from "./osis";
import { aggregateRelated, type CrossRefRow } from "./crossref";

describe("osis mapping", () => {
  it("maps app USFM codes to openbible OSIS and back", () => {
    expect(usfmToOsis("JHN")).toBe("John");
    expect(usfmToOsis("PSA")).toBe("Ps");
    expect(usfmToOsis("1CO")).toBe("1Cor");
    expect(usfmToOsis("SNG")).toBe("Song");
    expect(osisToUsfm("John")).toBe("JHN");
    expect(osisToUsfm("Ps")).toBe("PSA");
    expect(osisToUsfm("1Cor")).toBe("1CO");
  });
  it("is tolerant to case and returns null for unknown books", () => {
    expect(osisToUsfm("john")).toBe("JHN");
    expect(osisToUsfm("Sir")).toBeNull(); // Eclesiástico (apócrifo) não está nos 66
    expect(usfmToOsis("XYZ")).toBeNull();
  });
  it("covers all 66 books round-trip", () => {
    for (const b of BOOKS) {
      const osis = usfmToOsis(b.code);
      expect(osis, `USFM ${b.code} deve mapear para OSIS`).toBeTruthy();
      expect(osisToUsfm(osis!)).toBe(b.code);
    }
  });
});

describe("aggregateRelated", () => {
  it("mapeia OSIS→USFM, dedupa por destino mantendo max votes, ordena por votes", () => {
    const rows: CrossRefRow[] = [
      { to_book: "Rom", to_chapter: 5, to_verse_start: 8, to_verse_end: null, votes: 40 },
      { to_book: "Rom", to_chapter: 5, to_verse_start: 8, to_verse_end: null, votes: 55 }, // dup, maior
      { to_book: "1John", to_chapter: 4, to_verse_start: 9, to_verse_end: 10, votes: 30 },
      { to_book: "Sir", to_chapter: 1, to_verse_start: 1, to_verse_end: null, votes: 99 }, // apócrifo → ignora
    ];
    const out = aggregateRelated(rows, 10);
    expect(out.map((r) => r.label)).toEqual(["Romanos 5:8", "1 João 4:9-10"]);
    expect(out[0]!.votes).toBe(55);
    expect(out[0]!.book).toBe("ROM");
    expect(out[1]!.verse_end).toBe(10);
  });
  it("respeita o limite", () => {
    const rows: CrossRefRow[] = Array.from({ length: 20 }, (_, i) => ({
      to_book: "Ps",
      to_chapter: 1,
      to_verse_start: i + 1,
      to_verse_end: null,
      votes: i,
    }));
    expect(aggregateRelated(rows, 5)).toHaveLength(5);
  });
});
