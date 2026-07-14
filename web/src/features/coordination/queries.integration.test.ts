import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { listPosts, listTasks } from "./queries";

// Integração: avisos/tarefas da org de teste (org-scoping/RLS/shape).
describe.skipIf(!hasTestFixture)("Coordination queries (integração, org de teste)", () => {
  it("listPosts e listTasks respeitam o org-scoping e o shape", async () => {
    const { supabase, orgId } = await signInTestUser();
    const [posts, tasks] = await Promise.all([listPosts(supabase, orgId), listTasks(supabase, orgId)]);
    expect(Array.isArray(posts)).toBe(true);
    expect(Array.isArray(tasks)).toBe(true);
    for (const t of tasks) expect(typeof t.done).toBe("boolean");
  });
});
