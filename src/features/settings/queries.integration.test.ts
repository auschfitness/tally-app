import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadSettings } from "./queries";
import { isCurrency } from "./domain";

// Integração: Settings da org de teste — cada campo da sua fonte (org/campuses/blob/
// profile), no shape esperado. Usa o user id da sessão de teste.
describe.skipIf(!hasTestFixture)("Settings queries (integração, org de teste)", () => {
  it("loadSettings traz nome/moeda da org, campi da tabela e blob seguro", async () => {
    const { supabase, orgId } = await signInTestUser();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? "";

    const s = await loadSettings(supabase, orgId, userId);
    expect(typeof s.orgName).toBe("string");
    expect(isCurrency(s.currency)).toBe(true);
    expect(Array.isArray(s.campuses)).toBe(true);
    for (const c of s.campuses) {
      expect(typeof c.id).toBe("string");
      expect(typeof c.name).toBe("string");
    }
    expect(typeof s.institution.multiInstitution).toBe("boolean");
    expect(Array.isArray(s.institution.institutions)).toBe(true);
    expect(typeof s.account.timezone).toBe("string");
    expect(["pt-BR", "en", "es"]).toContain(s.locale); // idioma vem de profiles.locale
    expect(typeof s.userName).toBe("string");
  });
});
