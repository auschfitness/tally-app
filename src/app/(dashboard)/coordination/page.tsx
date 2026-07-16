import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { listPosts, listTasks } from "@/features/coordination/queries";
import { CoordBoard } from "@/features/coordination/components/CoordBoard";

// Coordenação (Server Component). Migrada do blob app_state para as tabelas
// coordination_posts / coordination_tasks. Mutações via Server Actions.
export default async function CoordinationPage() {
  const { supabase, user, orgId } = await requireOrg();

  const [posts, tasks, people] = await Promise.all([
    listPosts(supabase, orgId),
    listTasks(supabase, orgId),
    listSticks(supabase, orgId),
  ]);

  // Responsáveis: o usuário + líderes (espelha o app legado).
  const userName = user.email?.split("@")[0] ?? "Você";
  const assignees = [userName, ...people.filter((p) => p.isLeader).map((p) => p.name)].filter(
    (n, i, arr) => arr.indexOf(n) === i,
  );

  return <CoordBoard posts={posts} tasks={tasks} assignees={assignees} />;
}
