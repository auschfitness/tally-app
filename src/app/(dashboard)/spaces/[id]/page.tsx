import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg, can } from "@/lib/auth/session";
import { getSpace, listPosts } from "@/features/spaces/queries";
import { sortPostsForBoard, spaceKindSingular } from "@/features/spaces/domain";
import { Board } from "@/features/spaces/components/Board";

// Quadro de um espaço (Server Component): cabeçalho + lista de posts (fixados primeiro).
// A ação "Novo post" e o fixar/arquivar vivem no <Board> (client). RLS = membro da org.
export default async function SpaceBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;

  const [space, posts] = await Promise.all([
    getSpace(supabase, orgId, id),
    listPosts(supabase, orgId, id),
  ]);
  if (!space) notFound();

  const ordered = sortPostsForBoard(posts);

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

      <Board spaceId={id} posts={ordered} userId={user.id} canManageOrg={can(ctx, "org.manage")} />
    </>
  );
}
