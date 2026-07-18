import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg, can } from "@/lib/auth/session";
import { getPost } from "@/features/spaces/queries";
import { PostView } from "@/features/spaces/components/PostView";

// Post aberto (Server Component): o post + comentários. Edição/exclusão e a caixa de
// comentar vivem no <PostView> (client). RLS = membro; editar/apagar = autor ou org.manage.
export default async function SpacePostPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId } = await params;
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;

  const data = await getPost(supabase, orgId, id, postId);
  if (!data) notFound();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <Link href={`/spaces/${id}`} className="link">← Voltar ao quadro</Link>
      </div>
      <PostView
        spaceId={id}
        post={data.post}
        comments={data.comments}
        userId={user.id}
        canManageOrg={can(ctx, "org.manage")}
      />
    </>
  );
}
