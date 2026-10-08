import { describe, expect, it } from "vitest";
import { addMonths, billsInScope, findBillMatch, dueLabel, endOfWeek, groupOpenBills, needsExtension, occurrenceDate, pendingOccurrences, weekBills, weekSummary, type Bill } from "./bills";

const bill = (over: Partial<Bill>): Bill => ({
  id: "b",
  seriesId: "s",
  seq: 0,
  kind: "out",
  description: "Luz",
  amount: 100,
  dueDate: "2026-10-15",
  categoryId: "c",
  accountId: null,
  payee: "",
  notes: "",
  status: "open",
  paidOn: null,
  paidAmount: null,
  journalEntryId: null,
  ...over,
});

describe("occurrenceDate", () => {
  it("dia 31 cai no último dia do mês curto e volta a 31", () => {
    expect(occurrenceDate("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(occurrenceDate("2026-01-31", "monthly", 2)).toBe("2026-03-31");
    expect(occurrenceDate("2026-01-31", "monthly", 3)).toBe("2026-04-30");
  });
  it("semanal soma 7 dias e anual respeita 29/02", () => {
    expect(occurrenceDate("2026-10-08", "weekly", 2)).toBe("2026-10-22");
    expect(occurrenceDate("2028-02-29", "yearly", 1)).toBe("2029-02-28");
  });
  it("addMonths vira o ano", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
});

describe("pendingOccurrences", () => {
  it("gera da próxima seq até o horizonte e para no fim da série", () => {
    const s = { id: "s", frequency: "monthly" as const, anchorDate: "2026-10-15", endsOn: "2027-01-31", nextSeq: 1 };
    expect(pendingOccurrences(s, "2027-12-31")).toEqual([
      { seq: 1, dueDate: "2026-11-15" },
      { seq: 2, dueDate: "2026-12-15" },
      { seq: 3, dueDate: "2027-01-15" },
    ]);
  });
  it("completa a série quando falta menos de 6 meses gerados", () => {
    const s = { id: "s", frequency: "monthly" as const, anchorDate: "2026-01-10", endsOn: null, nextSeq: 12 };
    expect(needsExtension(s, "2026-10-08")).toBe(true);
    expect(needsExtension({ ...s, endsOn: "2026-12-01" }, "2026-10-08")).toBe(false);
  });
});

describe("billsInScope", () => {
  const bills = [
    bill({ id: "0", seq: 0, status: "paid" }),
    bill({ id: "1", seq: 1 }),
    bill({ id: "2", seq: 2 }),
    bill({ id: "3", seq: 3 }),
    bill({ id: "x", seriesId: "outra", seq: 2 }),
  ];
  const target = bills[2] as Bill;
  it("esta e as próximas não toca as pagas nem as anteriores", () => {
    expect(billsInScope(bills, target, "following").map((b) => b.id)).toEqual(["2", "3"]);
  });
  it("todas as abertas pula a paga e a outra série", () => {
    expect(billsInScope(bills, target, "all").map((b) => b.id)).toEqual(["1", "2", "3"]);
  });
  it("só esta", () => {
    expect(billsInScope(bills, target, "one").map((b) => b.id)).toEqual(["2"]);
  });
});

describe("rótulos e grupos", () => {
  it("dueLabel", () => {
    expect(dueLabel("2026-10-08", "2026-10-08")).toBe("Vence hoje");
    expect(dueLabel("2026-10-05", "2026-10-08")).toBe("Venceu há 3 dias");
    expect(dueLabel("2026-10-20", "2026-10-08")).toBe("Vence 20/10");
  });
  it("semana fecha no domingo", () => {
    expect(endOfWeek("2026-10-08")).toBe("2026-10-11"); // quinta → domingo
    expect(endOfWeek("2026-10-11")).toBe("2026-10-11");
  });
  it("agrupa vencidas, semana, próxima e meses", () => {
    const groups = groupOpenBills(
      [
        bill({ id: "a", dueDate: "2026-11-20" }),
        bill({ id: "b", dueDate: "2026-10-01" }),
        bill({ id: "c", dueDate: "2026-10-10" }),
        bill({ id: "d", dueDate: "2026-10-14" }),
        bill({ id: "e", dueDate: "2027-01-05" }),
        bill({ id: "p", dueDate: "2026-10-09", status: "paid" }),
      ],
      "2026-10-08",
    );
    expect(groups.map((g) => [g.label, g.items.map((b) => b.id)])).toEqual([
      ["Vencidas", ["b"]],
      ["Esta semana", ["c"]],
      ["Próxima semana", ["d"]],
      ["Novembro", ["a"]],
      ["Janeiro de 2027", ["e"]],
    ]);
  });
});

describe("esta semana", () => {
  it("soma vencidas + até domingo, por tipo, sem pagas", () => {
    const bills = [
      bill({ id: "late", dueDate: "2026-10-01", amount: 50 }),
      bill({ id: "sun", dueDate: "2026-10-11", amount: 100.1 }),
      bill({ id: "mon", dueDate: "2026-10-12", amount: 999 }),
      bill({ id: "in", kind: "in", dueDate: "2026-10-09", amount: 30 }),
      bill({ id: "paid", dueDate: "2026-10-09", status: "paid" }),
    ];
    expect(weekBills(bills, "2026-10-08", "out").map((b) => b.id)).toEqual(["late", "sun"]);
    expect(weekSummary(bills, "2026-10-08", "out")).toEqual({ total: 150.1, count: 2, overdue: 1 });
    expect(weekSummary(bills, "2026-10-08", "in")).toEqual({ total: 30, count: 1, overdue: 0 });
  });
});

describe("findBillMatch (extrato → conta)", () => {
  const luz = bill({ id: "luz", amount: 400, dueDate: "2026-10-15" });
  it("acha a conta com valor até 10% diferente e data a até 5 dias", () => {
    expect(findBillMatch({ date: "2026-10-18", amount: -432.1 }, [luz])?.id).toBe("luz");
  });
  it("recusa valor fora de 10%, data longe, direção errada ou conta paga", () => {
    expect(findBillMatch({ date: "2026-10-15", amount: -441 }, [luz])).toBeNull();
    expect(findBillMatch({ date: "2026-10-21", amount: -400 }, [luz])).toBeNull();
    expect(findBillMatch({ date: "2026-10-15", amount: 400 }, [luz])).toBeNull();
    expect(findBillMatch({ date: "2026-10-15", amount: -400 }, [{ ...luz, status: "paid" }])).toBeNull();
  });
  it("prefere o valor mais parecido e pula as já oferecidas", () => {
    const agua = bill({ id: "agua", amount: 410, dueDate: "2026-10-15" });
    expect(findBillMatch({ date: "2026-10-15", amount: -409 }, [luz, agua])?.id).toBe("agua");
    expect(findBillMatch({ date: "2026-10-15", amount: -409 }, [luz, agua], new Set(["agua"]))?.id).toBe("luz");
  });
});
