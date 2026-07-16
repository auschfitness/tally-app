import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listServices, serviceOccurrenceCounts, listPlanItems } from "./queries";
import { listAttendanceSessions } from "@/lib/attendance";

// Integração: Cultos da org de teste (org-scoping/RLS/shape + presença compartilhada
// com Groups via context_type). Não assume seed específico além de shape.
describe.skipIf(!hasTestFixture)("Services queries (integração, org de teste)", () => {
  it("listServices devolve cultos tipados e escopados", async () => {
    const { supabase, orgId } = await signInTestUser();
    const services = await listServices(supabase, orgId);
    expect(Array.isArray(services)).toBe(true);
    for (const s of services) {
      expect(typeof s.name).toBe("string");
      expect(typeof s.active).toBe("boolean");
      expect(["weekly", "monthly", "custom"]).toContain(s.recurring_pattern);
      expect(s.weekday === null || (s.weekday >= 0 && s.weekday <= 6)).toBe(true);
    }
  });

  it("occurrenceCounts e presença por culto vêm da MESMA tabela (context_type='service')", async () => {
    const { supabase, orgId } = await signInTestUser();
    const [services, occ] = await Promise.all([
      listServices(supabase, orgId),
      serviceOccurrenceCounts(supabase, orgId),
    ]);
    expect(occ instanceof Map).toBe(true);
    if (services.length) {
      const s = services[0]!;
      const sessions = await listAttendanceSessions(supabase, orgId, "service", s.id);
      // o contador do card bate com o nº de ocorrências carregadas para o culto.
      expect(occ.get(s.id) ?? 0).toBe(sessions.length);
      // plan items do template têm session_id nulo e ordem crescente.
      const plan = await listPlanItems(supabase, orgId, s.id);
      for (let i = 1; i < plan.length; i++) expect(plan[i]!.position >= plan[i - 1]!.position).toBe(true);
    }
  });
});
