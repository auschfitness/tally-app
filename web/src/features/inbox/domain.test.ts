import { describe, it, expect } from "vitest";
import { statusOf, visibleSignals, feedFor, countByCategory, LEVEL_RANK } from "./domain";
import type { Signal } from "@/features/signals/domain";
import type { OverridesMap } from "./types";

function sig(o: Partial<Signal> & { key: string }): Signal {
  return {
    key: o.key,
    type: o.type ?? "t",
    level: o.level ?? "notice",
    title: o.title ?? "T",
    why: o.why ?? [],
    date: o.date ?? "2026-07-14",
    category: o.category ?? "Journey",
    stickId: o.stickId,
    stickName: o.stickName,
    groupName: o.groupName,
  };
}

const all: Signal[] = [
  sig({ key: "a", level: "celebration", category: "Celebration" }),
  sig({ key: "b", level: "attention", category: "Care" }),
  sig({ key: "c", level: "notice", category: "Journey" }),
  sig({ key: "d", level: "attention", category: "Groups" }),
];

describe("statusOf", () => {
  it("default é new; senão o valor do mapa", () => {
    const ov: OverridesMap = new Map([["b", "dismissed"]]);
    expect(statusOf(ov, "a")).toBe("new");
    expect(statusOf(ov, "b")).toBe("dismissed");
  });
});

describe("visibleSignals", () => {
  it("esconde dismissed/snoozed/assigned e ordena por nível (attention→notice→celebration)", () => {
    const ov: OverridesMap = new Map([
      ["b", "dismissed"],
      ["d", "snoozed"],
    ]);
    // sobram a(celebration) e c(notice) → ordenados: c(notice=1) antes de a(celebration=2)
    expect(visibleSignals(all, ov).map((s) => s.key)).toEqual(["c", "a"]);
  });
  it("sem overrides mostra todos, atenção primeiro", () => {
    const order = visibleSignals(all, new Map()).map((s) => s.key);
    // b e d são attention (rank 0), c notice (1), a celebration (2)
    expect(order.slice(0, 2).sort()).toEqual(["b", "d"]);
    expect(order[2]).toBe("c");
    expect(order[3]).toBe("a");
  });
  it("não muta o array de entrada", () => {
    const copy = all.slice();
    visibleSignals(all, new Map());
    expect(all).toEqual(copy);
  });
});

describe("feedFor", () => {
  it('"all" devolve tudo visível; categoria filtra', () => {
    expect(feedFor(all, new Map(), "all").length).toBe(4);
    expect(feedFor(all, new Map(), "Care").map((s) => s.key)).toEqual(["b"]);
    expect(feedFor(all, new Map(), "Nada").length).toBe(0);
  });
});

describe("countByCategory", () => {
  it("conta só os visíveis por categoria", () => {
    const ov: OverridesMap = new Map([["b", "assigned"]]);
    const counts = countByCategory(all, ov);
    expect(counts.Care).toBeUndefined(); // b foi atribuído (oculto)
    expect(counts.Journey).toBe(1);
    expect(counts.Groups).toBe(1);
    expect(counts.Celebration).toBe(1);
  });
});

describe("LEVEL_RANK", () => {
  it("attention < notice < celebration", () => {
    expect(LEVEL_RANK.attention).toBeLessThan(LEVEL_RANK.notice);
    expect(LEVEL_RANK.notice).toBeLessThan(LEVEL_RANK.celebration);
  });
});
