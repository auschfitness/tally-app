import { describe, it, expect } from "vitest";
import {
  PLANS,
  PLAN_ORDER,
  ALL_FEATURES,
  FEATURE_LABELS,
  asPlanCode,
  planAllows,
  requiredPlanFor,
  planName,
} from "./catalog";

describe("asPlanCode", () => {
  it("reconhece 'pro'", () => {
    expect(asPlanCode("pro")).toBe("pro");
  });
  it("qualquer outra coisa cai em 'free' (mais restritivo)", () => {
    expect(asPlanCode("free")).toBe("free");
    expect(asPlanCode("")).toBe("free");
    expect(asPlanCode(null)).toBe("free");
    expect(asPlanCode(undefined)).toBe("free");
    expect(asPlanCode("enterprise")).toBe("free");
  });
});

describe("planAllows", () => {
  it("Free não libera nenhum recurso travado", () => {
    for (const f of ALL_FEATURES) expect(planAllows("free", f)).toBe(false);
  });
  it("Pro libera todos os recursos travados", () => {
    for (const f of ALL_FEATURES) expect(planAllows("pro", f)).toBe(true);
  });
  it("plano desconhecido é tratado como Free (bloqueia)", () => {
    expect(planAllows("xyz", "accounting")).toBe(false);
    expect(planAllows(null, "giving")).toBe(false);
  });
});

describe("requiredPlanFor", () => {
  it("todo recurso travado exige Pro", () => {
    for (const f of ALL_FEATURES) expect(requiredPlanFor(f)).toBe("pro");
  });
});

describe("integridade do catálogo", () => {
  it("Pro inclui exatamente todos os recursos travados", () => {
    expect([...PLANS.pro.features].sort()).toEqual([...ALL_FEATURES].sort());
  });
  it("Free é vazio (só núcleo)", () => {
    expect(PLANS.free.features).toEqual([]);
  });
  it("todo recurso tem rótulo humano", () => {
    for (const f of ALL_FEATURES) expect(FEATURE_LABELS[f]).toBeTruthy();
  });
  it("PLAN_ORDER cobre todos os planos, do menor ao maior", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro"]);
    expect(Object.keys(PLANS).sort()).toEqual([...PLAN_ORDER].sort());
  });
  it("cada plano tem nome, tagline e gancho de preço", () => {
    for (const code of PLAN_ORDER) {
      expect(PLANS[code].name).toBeTruthy();
      expect(PLANS[code].tagline).toBeTruthy();
      expect(PLANS[code].priceHint).toBeTruthy();
    }
  });
});

describe("planName", () => {
  it("devolve o nome comercial", () => {
    expect(planName("free")).toBe("Comunidade");
    expect(planName("pro")).toBe("Igreja");
    expect(planName("lixo")).toBe("Comunidade");
  });
});
