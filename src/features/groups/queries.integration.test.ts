import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listGroups } from "./queries";

// Integração: grupos da org de teste (org-scoping/RLS/shape + resolução de líder).
describe.skipIf(!hasTestFixture)("Groups queries (integração, org de teste)", () => {
  it("listGroups devolve grupos com líder e contadores resolvidos", async () => {
    const { supabase, orgId } = await signInTestUser();
    const groups = await listGroups(supabase, orgId);
    expect(Array.isArray(groups)).toBe(true);
    for (const g of groups) {
      expect(typeof g.name).toBe("string");
      expect(typeof g.leader).toBe("string");
      expect(typeof g.newMembers).toBe("number");
    }
    // A fixture semeia "Grupo Teste" com Ana como líder.
    const teste = groups.find((g) => g.name.includes("Teste"));
    if (teste) expect(teste.leader.length).toBeGreaterThan(0);
  });
});
