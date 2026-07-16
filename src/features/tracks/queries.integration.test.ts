import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadTracks } from "./queries";
import { enrollmentPosition, planAdvance } from "./domain";

// Integração: Trilhas da org de teste (org-scoping/RLS/shape). Etapas ordenadas por
// position; matrículas escopadas; domínio puro consome o resultado sem quebrar.
describe.skipIf(!hasTestFixture)("Tracks queries (integração, org de teste)", () => {
  it("loadTracks devolve trilhas tipadas com etapas ordenadas e matrículas escopadas", async () => {
    const { supabase, orgId } = await signInTestUser();
    const { tracks, enrollments } = await loadTracks(supabase, orgId);
    expect(Array.isArray(tracks)).toBe(true);
    expect(Array.isArray(enrollments)).toBe(true);

    for (const t of tracks) {
      expect(typeof t.name).toBe("string");
      expect(typeof t.status).toBe("string");
      // etapas em ordem crescente de position
      const positions = t.steps.map((s) => s.position);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }

    // toda matrícula pertence a uma trilha carregada (mesma org) e o domínio a lê.
    const trackIds = new Set(tracks.map((t) => t.id));
    for (const e of enrollments) {
      expect(trackIds.has(e.track_id)).toBe(true);
      expect(typeof e.progress).toBe("number");
      const track = tracks.find((t) => t.id === e.track_id)!;
      const p = enrollmentPosition(e, track.steps);
      expect(p.pct).toBeGreaterThanOrEqual(0);
      expect(p.pct).toBeLessThanOrEqual(100);
      // planAdvance nunca lança sobre dados reais.
      expect(["noop", "advance", "complete"]).toContain(planAdvance(e, track.steps).kind);
    }
  });
});
