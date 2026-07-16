import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { buildSignalsInput, loadOverrides } from "./queries";
import { signals } from "@/features/signals/domain";
import { visibleSignals, feedFor } from "./domain";

// Integração: o assembler monta o SignalsInput a partir das queries reais da org de
// teste, o engine calcula Signals válidos e os overrides são lidos. Sem tabela nova
// (reuso cross-feature). `now` fixo para determinismo.
const NOW = new Date("2026-07-14T12:00:00Z");

describe.skipIf(!hasTestFixture)("Inbox assembler (integração, org de teste)", () => {
  it("buildSignalsInput reúne as fontes e o engine produz Signals bem-formados", async () => {
    const { supabase, orgId } = await signInTestUser();
    const campusRes = await supabase.from("campuses").select("name").eq("org_id", orgId).order("name");
    const activeCampus = (campusRes.data ?? [])[0]?.name ?? "";

    const input = await buildSignalsInput(supabase, orgId, activeCampus);
    // as coleções existem e têm o tipo esperado
    expect(Array.isArray(input.people)).toBe(true);
    expect(input.milestonesByStick instanceof Map).toBe(true);
    expect(Array.isArray(input.sessions)).toBe(true);
    expect(Array.isArray(input.teams)).toBe(true);
    expect(input.activeCampus).toBe(activeCampus);

    const all = signals(input, NOW);
    for (const s of all) {
      expect(typeof s.key).toBe("string");
      expect(["attention", "notice", "celebration"]).toContain(s.level);
      expect(["Care", "Journey", "Celebration", "Groups", "Teams", "Services"]).toContain(s.category);
      expect(Array.isArray(s.why)).toBe(true);
    }
    // chaves de signal são únicas (overrides casam 1:1 por signal_key)
    expect(new Set(all.map((s) => s.key)).size).toBe(all.length);
  });

  it("loadOverrides devolve um mapa e o feed respeita status/categoria", async () => {
    const { supabase, orgId } = await signInTestUser();
    const campusRes = await supabase.from("campuses").select("name").eq("org_id", orgId).order("name");
    const activeCampus = (campusRes.data ?? [])[0]?.name ?? "";

    const [input, overrides] = await Promise.all([buildSignalsInput(supabase, orgId, activeCampus), loadOverrides(supabase, orgId)]);
    expect(overrides instanceof Map).toBe(true);

    const all = signals(input, NOW);
    const vis = visibleSignals(all, overrides);
    // visíveis são subconjunto do total, e "all" no feed = todos os visíveis
    expect(vis.length).toBeLessThanOrEqual(all.length);
    expect(feedFor(all, overrides, "all").length).toBe(vis.length);
  });
});
