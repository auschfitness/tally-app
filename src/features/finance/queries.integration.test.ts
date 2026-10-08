import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadLedger } from "./queries";

// Integração: o livro da org de teste vem no shape esperado (RLS por finance.manage).
describe.skipIf(!hasTestFixture)("loadLedger (integração, org de teste)", () => {
  it("loadLedger devolve plano de contas e movimentos traduzidos", async () => {
    const { supabase, orgId } = await signInTestUser();
    const ledger = await loadLedger(supabase, orgId);
    expect(Array.isArray(ledger.accounts)).toBe(true);
    expect(ledger.movements).toHaveLength(ledger.entries.length);
    for (const m of ledger.movements) {
      expect(["in", "out", "transfer", "other"]).toContain(m.kind);
      expect(typeof m.amount).toBe("number");
    }
  });
});
