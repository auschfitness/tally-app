import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listSermons, listSeries } from "./queries";

// Integração: Sermões/Séries da org de teste (org-scoping/RLS/shape + content jsonb
// como objeto, nunca null).
describe.skipIf(!hasTestFixture)("Study queries (integração, org de teste)", () => {
  it("listSermons devolve sermões tipados, com content objeto e enums válidos", async () => {
    const { supabase, orgId } = await signInTestUser();
    const sermons = await listSermons(supabase, orgId);
    expect(Array.isArray(sermons)).toBe(true);
    for (const s of sermons) {
      expect(typeof s.title).toBe("string");
      expect(["draft", "preparing", "ready", "preached", "archived"]).toContain(s.status);
      expect(["private", "leadership", "church", "public"]).toContain(s.visibility);
      // content jsonb sempre objeto (nunca null/array).
      expect(s.content !== null && typeof s.content === "object" && !Array.isArray(s.content)).toBe(true);
    }
  });

  it("listSeries devolve séries tipadas e escopadas", async () => {
    const { supabase, orgId } = await signInTestUser();
    const series = await listSeries(supabase, orgId);
    expect(Array.isArray(series)).toBe(true);
    for (const se of series) {
      expect(typeof se.title).toBe("string");
      expect(["planning", "active", "completed", "archived"]).toContain(se.status);
    }
  });
});
