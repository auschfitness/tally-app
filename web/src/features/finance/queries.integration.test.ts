import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listEntries, listFunds, listCategories } from "./queries";

// Integração: finanças da org de teste (org-scoping/RLS/shape).
describe.skipIf(!hasTestFixture)("Finance queries (integração, org de teste)", () => {
  it("listEntries devolve lançamentos no shape esperado", async () => {
    const { supabase, orgId } = await signInTestUser();
    const entries = await listEntries(supabase, orgId);
    expect(Array.isArray(entries)).toBe(true);
    for (const e of entries) {
      expect(["in", "out"]).toContain(e.type);
      expect(typeof e.amount).toBe("number");
      expect(typeof e.date).toBe("string");
    }
  });

  it("listFunds e listCategories devolvem listas da org", async () => {
    const { supabase, orgId } = await signInTestUser();
    const funds = await listFunds(supabase, orgId);
    const cats = await listCategories(supabase, orgId);
    expect(Array.isArray(funds)).toBe(true);
    expect(Array.isArray(cats.in)).toBe(true);
    expect(Array.isArray(cats.out)).toBe(true);
  });
});
