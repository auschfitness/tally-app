import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadHomeData } from "./queries";
import { signals } from "@/features/signals/domain";
import { riskDist, weeklyAttendance, communityInsights, homeVisibleSignals, todayCounts } from "./domain";

// Integração: a Home agrega as fontes reais da org de teste e o domínio projeta o
// Pulse sem quebrar. Sem tabela nova (reuso do assembler do Inbox + orações/estudo/
// jornada). `now` fixo p/ determinismo.
const NOW = new Date("2026-07-15T12:00:00Z");

describe.skipIf(!hasTestFixture)("Home (integração, org de teste)", () => {
  it("loadHomeData + domínio produzem um Pulse coerente", async () => {
    const { supabase, orgId } = await signInTestUser();
    const campusRes = await supabase.from("campuses").select("name").eq("org_id", orgId).order("name");
    const activeCampus = (campusRes.data ?? [])[0]?.name ?? "";

    const data = await loadHomeData(supabase, orgId, activeCampus, NOW);
    expect(typeof data.prayersAnswered).toBe("number");
    expect(typeof data.movement30).toBe("number");

    const all = signals(data.input, NOW);
    const visible = homeVisibleSignals(all, data.overrides);
    expect(visible.length).toBeLessThanOrEqual(all.length);

    const rd = riskDist(data.input.people, activeCampus);
    expect(rd.em + rd.at + rd.ri).toBe(rd.total);

    const att = weeklyAttendance(data.input.sessions, NOW, 8);
    expect(att.length).toBe(8);
    for (const p of att) expect(p.count).toBeGreaterThanOrEqual(0); // real, nunca negativo/sintético

    const ci = communityInsights(data.input.people, data.input.groupsHealth, data.movement30, activeCampus);
    expect(ci.inGroup + ci.noGroup.length).toBe(ci.total);

    const tc = todayCounts(visible, data.input.groupsHealth, data.input.people, activeCampus, data.prayersAnswered);
    expect(tc.care).toBeGreaterThanOrEqual(0);
    expect(tc.prayersAnswered).toBe(data.prayersAnswered);
  });
});
