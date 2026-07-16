import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadTeamsData, readLeadershipDev } from "./queries";

// Integração: Times da org de teste (org-scoping/RLS/shape + resolução de campus e
// nomes). A fixture semeia ministries=3, teams=3, team_members=6, schedule=3.
describe.skipIf(!hasTestFixture)("Teams queries (integração, org de teste)", () => {
  it("loadTeamsData devolve ministérios/times/membros/escala tipados e escopados", async () => {
    const { supabase, orgId } = await signInTestUser();
    const data = await loadTeamsData(supabase, orgId);

    expect(Array.isArray(data.ministries)).toBe(true);
    expect(Array.isArray(data.teams)).toBe(true);
    expect(data.teams.length).toBeGreaterThan(0);

    for (const t of data.teams) {
      expect(typeof t.name).toBe("string");
      expect(Array.isArray(t.serving_roles)).toBe(true);
      expect(["active", "inactive", "archived"]).toContain(t.status);
    }
    for (const m of data.members) {
      expect(["active", "paused", "inactive"]).toContain(m.status);
      expect(typeof m.team_id).toBe("string");
    }
    // Todo membro referencia um time carregado (mesma org).
    const teamIds = new Set(data.teams.map((t) => t.id));
    for (const m of data.members) expect(teamIds.has(m.team_id)).toBe(true);
    // nameByStick resolve nomes (sticks não arquivadas).
    expect(data.nameByStick instanceof Map).toBe(true);
  });
});

describe("readLeadershipDev", () => {
  it("extrai só estágios válidos do blob e ignora lixo", () => {
    expect(readLeadershipDev({ leadershipDev: { a: "apprentice", b: "co_leader", c: "nope", d: 3 } })).toEqual({
      a: "apprentice",
      b: "co_leader",
    });
    expect(readLeadershipDev(null)).toEqual({});
    expect(readLeadershipDev({ other: 1 })).toEqual({});
  });
});
