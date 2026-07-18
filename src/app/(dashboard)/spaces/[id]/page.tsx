import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg, can } from "@/lib/auth/session";
import { isoDate, today } from "@/lib/utils/date";
import { getSpace, listPosts, listTodoLists, listOrgMembers } from "@/features/spaces/queries";
import { sortPostsForBoard, spaceKindSingular } from "@/features/spaces/domain";
import { SpaceView } from "@/features/spaces/components/SpaceView";

// Espaço (Server Component): cabeçalho + a casca com abas Mensagens/Tarefas. Posts
// (fixados primeiro), listas de tarefas e membros da org vêm prontos daqui. RLS = membro.
export default async function SpaceBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;

  const [space, posts, lists, members] = await Promise.all([
    getSpace(supabase, orgId, id),
    listPosts(supabase, orgId, id),
    listTodoLists(supabase, orgId, id),
    listOrgMembers(supabase, orgId),
  ]);
  if (!space) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 className="page">{space.name}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {spaceKindSingular(space.kind)}
            {space.description ? ` · ${space.description}` : ""}
          </p>
        </div>
        <Link href="/spaces" className="link">← Voltar</Link>
      </div>

      <SpaceView
        spaceId={id}
        userId={user.id}
        canManageOrg={can(ctx, "org.manage")}
        posts={sortPostsForBoard(posts)}
        lists={lists}
        members={members}
        todayIso={isoDate(today())}
      />
    </>
  );
}
