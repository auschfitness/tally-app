import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadCalendarSources } from "./queries";
import { listServices } from "@/features/services/queries";
import { listEvents } from "@/features/events/queries";

// Integração: a agregação reusa as fontes migradas e normaliza. Verifica que os itens
// normalizados batem com o que Services/Events retornam (mesma org/RLS).
describe.skipIf(!hasTestFixture)("Calendar queries (integração, org de teste)", () => {
  it("loadCalendarSources normaliza as três fontes sem perder itens", async () => {
    const { supabase, orgId } = await signInTestUser();
    const [sources, services, events] = await Promise.all([
      loadCalendarSources(supabase, orgId),
      listServices(supabase, orgId),
      listEvents(supabase, orgId),
    ]);

    // Serviços e eventos são 1:1 com as queries de origem (só normalização de campos).
    expect(sources.services.length).toBe(services.length);
    expect(sources.events.length).toBe(events.length);

    for (const s of sources.services) {
      expect(typeof s.name).toBe("string");
      expect(["weekly", "monthly", "custom"]).toContain(s.recurring_pattern);
    }
    for (const a of sources.assignments) {
      // teamName sempre resolve (nome do time ou fallback "Escala").
      expect(typeof a.teamName).toBe("string");
      expect(a.teamName.length).toBeGreaterThan(0);
      expect(a.assignment_date === "" || /^\d{4}-\d{2}-\d{2}$/.test(a.assignment_date)).toBe(true);
    }
  });
});
