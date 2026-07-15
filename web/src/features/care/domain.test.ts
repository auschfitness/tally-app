import { describe, it, expect } from "vitest";
import { isOpen, priorityRank, sortCareItems, careSummary, splitCare, PRIORITY_BAND } from "./domain";
import type { CareItem, CarePriority, CareStatus } from "./types";

function item(o: Partial<CareItem>): CareItem {
  return {
    id: o.id ?? "c",
    stick_id: o.stick_id ?? null,
    stickName: o.stickName ?? "",
    signal_id: o.signal_id ?? null,
    category: o.category ?? "",
    title: o.title ?? "Cuidar",
    description: o.description ?? "",
    assigned_to: o.assigned_to ?? null,
    assignedName: o.assignedName ?? "",
    priority: (o.priority ?? "attention") as CarePriority,
    status: (o.status ?? "assigned") as CareStatus,
    due_date: o.due_date ?? "",
    confidentiality_level: o.confidentiality_level ?? "standard",
    next_action: o.next_action ?? "",
    created_at: o.created_at ?? "",
    resolved_at: o.resolved_at ?? null,
    contacts: o.contacts ?? [],
    notes: o.notes ?? [],
  };
}

describe("isOpen", () => {
  it("aberto enquanto não resolvido/fechado", () => {
    for (const s of ["new", "assigned", "in_progress", "waiting"] as CareStatus[]) expect(isOpen(s)).toBe(true);
    expect(isOpen("resolved")).toBe(false);
    expect(isOpen("closed")).toBe(false);
  });
});

describe("priorityRank / sortCareItems", () => {
  it("urgente < atenção < aviso < celebração", () => {
    expect(priorityRank("urgent")).toBeLessThan(priorityRank("attention"));
    expect(priorityRank("attention")).toBeLessThan(priorityRank("notice"));
    expect(priorityRank("notice")).toBeLessThan(priorityRank("celebration"));
  });
  it("ordena por urgência e, no empate, pelo prazo mais próximo (sem prazo ao fim)", () => {
    const items = [
      item({ id: "a", priority: "notice", due_date: "2026-01-01" }),
      item({ id: "b", priority: "urgent", due_date: "" }),
      item({ id: "c", priority: "urgent", due_date: "2026-03-01" }),
      item({ id: "d", priority: "attention", due_date: "2026-02-01" }),
    ];
    expect(sortCareItems(items).map((x) => x.id)).toEqual(["c", "b", "d", "a"]);
  });
  it("não muta o array original", () => {
    const items = [item({ id: "a", priority: "notice" }), item({ id: "b", priority: "urgent" })];
    const copy = items.slice();
    sortCareItems(items);
    expect(items).toEqual(copy);
  });
});

describe("careSummary / splitCare", () => {
  const items = [
    item({ id: "1", status: "assigned" }),
    item({ id: "2", status: "in_progress" }),
    item({ id: "3", status: "resolved" }),
    item({ id: "4", status: "closed" }),
  ];
  it("conta abertos vs. resolvidos/fechados", () => {
    expect(careSummary(items)).toEqual({ open: 2, resolved: 2 });
  });
  it("separa abertos (ordenados) dos resolvidos", () => {
    const { open, resolved } = splitCare(items);
    expect(open.map((x) => x.id).sort()).toEqual(["1", "2"]);
    expect(resolved.map((x) => x.id).sort()).toEqual(["3", "4"]);
  });
});

describe("PRIORITY_BAND", () => {
  it("mapeia urgência para faixa de cor", () => {
    expect(PRIORITY_BAND.urgent).toBe("risk");
    expect(PRIORITY_BAND.celebration).toBe("healthy");
  });
});
