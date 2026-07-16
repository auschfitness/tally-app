import { describe, it, expect } from "vitest";
import { prayerCloudData, prayerMatch, ansLeft, isPrunable, type PrayerRequest } from "./domain";

function mk(p: Partial<PrayerRequest>): PrayerRequest {
  return {
    id: p.id ?? "1",
    title: p.title ?? "",
    author: p.author ?? "Anônimo",
    request: p.request ?? "pedido",
    privacy: p.privacy ?? "church",
    group: p.group ?? "",
    topics: p.topics ?? [],
    praying: p.praying ?? 0,
    answered: p.answered ?? false,
    answeredDate: p.answeredDate ?? null,
    date: p.date ?? "2026-07-01",
  };
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("prayerCloudData (paridade com derived.js)", () => {
  it("agrega temas, grupos e autores (≠ Anônimo) só de pedidos não respondidos", () => {
    const words = prayerCloudData([
      mk({ id: "a", author: "Ruth", topics: ["saúde", "família"], group: "Mulheres" }),
      mk({ id: "b", author: "Ruth", topics: ["saúde"], group: "" }),
      mk({ id: "c", author: "Anônimo", topics: ["saúde"], answered: true }), // ignorado (respondido)
    ]);
    const saude = words.find((w) => w.cat === "topic" && w.text === "saúde");
    const ruth = words.find((w) => w.cat === "name" && w.text === "Ruth");
    expect(saude?.count).toBe(2);
    expect(ruth?.count).toBe(2);
    // Anônimo nunca vira palavra de nome:
    expect(words.some((w) => w.cat === "name" && w.text === "Anônimo")).toBe(false);
  });

  it("ordena por frequência e limita a 28", () => {
    const many: PrayerRequest[] = Array.from({ length: 40 }, (_, i) => mk({ id: String(i), topics: ["t" + i] }));
    expect(prayerCloudData(many).length).toBe(28);
  });
});

describe("prayerMatch", () => {
  const p = mk({ topics: ["saúde"], group: "Mulheres", author: "Ruth" });
  it("sem filtro casa tudo", () => expect(prayerMatch(p, null)).toBe(true));
  it("por tema", () => expect(prayerMatch(p, { cat: "topic", val: "saúde" })).toBe(true));
  it("por grupo", () => expect(prayerMatch(p, { cat: "group", val: "Homens" })).toBe(false));
  it("por nome", () => expect(prayerMatch(p, { cat: "name", val: "Ruth" })).toBe(true));
});

describe("prune de respondidas (+30 dias)", () => {
  it("respondida sem data nunca some", () => {
    expect(isPrunable(mk({ answered: true, answeredDate: null }))).toBe(false);
  });
  it("respondida há 40 dias é podável", () => {
    expect(isPrunable(mk({ answered: true, answeredDate: daysAgoIso(40) }))).toBe(true);
  });
  it("respondida há 10 dias ainda fica, com contagem regressiva", () => {
    const p = mk({ answered: true, answeredDate: daysAgoIso(10) });
    expect(isPrunable(p)).toBe(false);
    expect(ansLeft(p)).toMatch(/some em \d+ dias?/);
  });
});
