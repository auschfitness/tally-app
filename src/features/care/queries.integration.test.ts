import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { loadCare, listCareMembers } from "./queries";
import { careSummary, splitCare } from "./domain";

// Integração: Care da org de teste. O usuário semeado é OWNER → has_perm(care.view/
// care.manage) passa (confirmado no handoff), então lê os itens. O caminho NEGATIVO
// (membro SEM care.view não vê nada) NÃO é coberto aqui — depende de um usuário de
// teste não-owner que o orquestrador vai semear (ver README).
describe.skipIf(!hasTestFixture)("Care queries (integração, org de teste, como owner)", () => {
  it("loadCare devolve itens tipados, com enums válidos, contatos/notas em array e nomes resolvidos", async () => {
    const { supabase, orgId } = await signInTestUser();
    const items = await loadCare(supabase, orgId);
    expect(Array.isArray(items)).toBe(true);
    for (const it of items) {
      expect(typeof it.title).toBe("string");
      expect(["celebration", "notice", "attention", "urgent"]).toContain(it.priority);
      expect(["new", "assigned", "in_progress", "waiting", "resolved", "closed"]).toContain(it.status);
      expect(Array.isArray(it.contacts)).toBe(true);
      expect(Array.isArray(it.notes)).toBe(true);
      // responsável resolve para string (nome ou "—"), nunca undefined.
      expect(typeof it.assignedName).toBe("string");
    }
    // domínio consome o resultado sem quebrar.
    const s = careSummary(items);
    expect(s.open + s.resolved).toBe(items.length);
    expect(splitCare(items).open.length).toBe(s.open);
  });

  it("listCareMembers devolve responsáveis atribuíveis (inclui o owner logado)", async () => {
    const { supabase, orgId } = await signInTestUser();
    const members = await listCareMembers(supabase, orgId);
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThanOrEqual(1); // ao menos o próprio owner
    for (const m of members) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
    }
  });
});
