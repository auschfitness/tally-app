import { describe, it, expect } from "vitest";
import { parseRefs, buildReference } from "./parse";
import { NAME_TO_CODE, bookName, BOOKS } from "./books";

describe("bible books", () => {
  it("tem 66 livros e mapeia abreviações PT/EN", () => {
    expect(BOOKS).toHaveLength(66);
    expect(NAME_TO_CODE["joao"]).toBe("JHN");
    expect(NAME_TO_CODE["jhn"]).toBe("JHN");
    expect(NAME_TO_CODE["rm"]).toBe("ROM");
    expect(NAME_TO_CODE["1co"]).toBe("1CO");
    expect(bookName("PSA")).toBe("Salmos");
  });
});

describe("buildReference", () => {
  it("monta a forma canônica PT", () => {
    expect(buildReference("ROM", 8, 28, null)).toBe("Romanos 8:28");
    expect(buildReference("JHN", 10, 1, 18)).toBe("João 10:1-18");
    expect(buildReference("PSA", 23, null, null)).toBe("Salmos 23");
    expect(buildReference("JHN", 3, 16, 16)).toBe("João 3:16"); // ve==vs colapsa
  });
});

describe("parseRefs", () => {
  it("detecta PT com intervalo", () => {
    const r = parseRefs("Vamos ler João 10:1-18 hoje.");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ book: "JHN", chapter: 10, verse_start: 1, verse_end: 18, reference: "João 10:1-18" });
  });
  it("abreviação e livro numerado (Rm, 1Co)", () => {
    const r = parseRefs("Rm 8:28 e 1Co 13 falam disso");
    expect(r.map((x) => x.reference)).toEqual(["Romanos 8:28", "1 Coríntios 13"]);
  });
  it("EN e só-capítulo (Salmo 23)", () => {
    expect(parseRefs("John 3:16").map((x) => x.book)).toEqual(["JHN"]);
    expect(parseRefs("Salmo 23").map((x) => x.reference)).toEqual(["Salmos 23"]);
  });
  it("dedup de referências repetidas", () => {
    expect(parseRefs("João 10:1-18 ... de novo João 10:1-18")).toHaveLength(1);
  });
  it("ignora palavras que não são livros", () => {
    expect(parseRefs("capítulo 5 da vida moderna 2024")).toHaveLength(0);
  });
  it("intervalo invertido descarta o fim", () => {
    const r = parseRefs("Gn 1:10-3");
    expect(r[0]).toMatchObject({ verse_start: 10, verse_end: null });
  });
  it("texto vazio → []", () => {
    expect(parseRefs("")).toEqual([]);
  });
});
