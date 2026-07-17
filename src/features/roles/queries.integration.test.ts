import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadMembers, loadRoles } from "./queries";
import { isPermissionKey } from "./domain";

// Integração: cargos e membros da org de teste. O usuário da fixture é owner, então
// enxerga os 6 cargos de sistema (m26/m27) e ao menos a si mesmo entre os membros.
describe.skipIf(!hasTestFixture)("Roles queries (integração, org de teste)", () => {
  it("loadRoles traz os cargos com permissões conhecidas e contagem de membros", async () => {
    const { supabase, orgId } = await signInTestUser();
    const roles = await loadRoles(supabase, orgId);

    expect(roles.length).toBeGreaterThanOrEqual(6); // 6 cargos de sistema semeados
    expect(roles.some((r) => r.name === "Dono" && r.is_system)).toBe(true);
    for (const r of roles) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.memberCount).toBe("number");
      // toda permissão gravada é do catálogo (nada estranho vindo do banco)
      for (const p of r.permissions) expect(isPermissionKey(p)).toBe(true);
    }
  });

  it("loadMembers junta profiles e marca o próprio usuário (isSelf)", async () => {
    const { supabase, orgId } = await signInTestUser();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? "";

    const members = await loadMembers(supabase, orgId, userId);
    expect(members.length).toBeGreaterThanOrEqual(1);
    const me = members.find((m) => m.isSelf);
    expect(me).toBeTruthy();
    expect(me?.userId).toBe(userId);
    for (const m of members) {
      expect(typeof m.name).toBe("string");
      expect(typeof m.isOwner).toBe("boolean");
    }
  });
});
