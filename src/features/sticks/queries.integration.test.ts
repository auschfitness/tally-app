import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listSticks, listGroupNames, listPeople, getPerson } from "./queries";
import { RELATIONSHIPS } from "./domain";

// Integração: prova que a camada de dados respeita o RLS/org-scoping e devolve o
// shape esperado, com uma SESSÃO de usuário de teste real. Auto-pula sem fixture.
describe.skipIf(!hasTestFixture)("Sticks queries (integração, org de teste)", () => {
  it("listSticks devolve só Sticks da org do usuário, no shape do view model", async () => {
    const { supabase, orgId } = await signInTestUser();
    const people = await listSticks(supabase, orgId);
    expect(Array.isArray(people)).toBe(true);
    for (const p of people) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(RELATIONSHIPS).toContain(p.relationship);
      expect(typeof p.journeyStage).toBe("string");
    }
  });

  it("listGroupNames devolve nomes de grupo da org", async () => {
    const { supabase, orgId } = await signInTestUser();
    const groups = await listGroupNames(supabase, orgId);
    expect(Array.isArray(groups)).toBe(true);
    for (const g of groups) expect(typeof g).toBe("string");
  });

  it("listPeople e getPerson devolvem a lista e a ficha no shape novo", async () => {
    const { supabase, orgId } = await signInTestUser();
    const { people, groups } = await listPeople(supabase, orgId);
    expect(Array.isArray(groups)).toBe(true);
    for (const p of people) {
      expect(typeof p.name).toBe("string");
      expect(Array.isArray(p.groupIds)).toBe(true);
    }
    expect(await getPerson(supabase, orgId, "00000000-0000-0000-0000-000000000000", true)).toBeNull();
    const first = people[0];
    if (first) {
      const d = await getPerson(supabase, orgId, first.id, true);
      expect(d?.values.name).toBe(first.name);
      expect(d?.tithes?.year).toBe(new Date().getFullYear());
    }
  });
});
