import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listEvents, eventRegCounts, listEventRegistrations } from "./queries";

// Integração: Eventos da org de teste (org-scoping/RLS/shape + contagem de inscrições
// coerente com as inscrições carregadas por evento).
describe.skipIf(!hasTestFixture)("Events queries (integração, org de teste)", () => {
  it("listEvents devolve eventos tipados e escopados", async () => {
    const { supabase, orgId } = await signInTestUser();
    const events = await listEvents(supabase, orgId);
    expect(Array.isArray(events)).toBe(true);
    for (const e of events) {
      expect(typeof e.name).toBe("string");
      expect(["draft", "active", "completed", "cancelled"]).toContain(e.status);
      expect(typeof e.registration_required).toBe("boolean");
      // start_time/end_time são HH:MM (ou "") extraídos dos timestamptz.
      expect(e.start_time === "" || /^\d{2}:\d{2}$/.test(e.start_time)).toBe(true);
    }
  });

  it("o contador do card bate com as inscrições carregadas do evento", async () => {
    const { supabase, orgId } = await signInTestUser();
    const [events, counts] = await Promise.all([listEvents(supabase, orgId), eventRegCounts(supabase, orgId)]);
    expect(counts instanceof Map).toBe(true);
    if (events.length) {
      const e = events[0]!;
      const regs = await listEventRegistrations(supabase, orgId, e.id);
      expect(counts.get(e.id) ?? 0).toBe(regs.length);
      for (const r of regs) {
        expect(r.event_id).toBe(e.id);
        expect(typeof r.checked_in).toBe("boolean");
      }
    }
  });
});
