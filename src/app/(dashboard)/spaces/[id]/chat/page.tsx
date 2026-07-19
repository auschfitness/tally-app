import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg, can } from "@/lib/auth/session";
import { isoDate, today } from "@/lib/utils/date";
import { getSpace, listChatMessages, listOrgMembers } from "@/features/spaces/queries";
import { spaceKindSingular } from "@/features/spaces/domain";
import { ChatRoom } from "@/features/spaces/components/ChatRoom";
import { SpaceVisibility } from "@/features/spaces/components/SpaceVisibility";

// Chat ao vivo de um espaço (Server Component): carrega o espaço (RLS can_see_space →
// notFound se não enxerga), as últimas mensagens e o mapa de nomes (para resolver o autor
// das mensagens que chegam em tempo real). A sala em si (assinatura, envio, exclusão) é
// client. Abas iguais às do quadro; aqui "Chat" está ativa.
export default async function SpaceChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;
  const canManageOrg = can(ctx, "org.manage");

  const [space, page, members] = await Promise.all([
    getSpace(supabase, orgId, id),
    listChatMessages(supabase, orgId, id),
    listOrgMembers(supabase, orgId),
  ]);
  if (!space) notFound();

  const nameById: Record<string, string> = {};
  for (const m of members) nameById[m.id] = m.name;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 className="page">{space.name}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {spaceKindSingular(space.kind)}
            {space.description ? ` · ${space.description}` : ""}
          </p>
        </div>
        {canManageOrg ? <SpaceVisibility spaceId={id} visibility={space.visibility} /> : null}
        <Link href="/spaces" className="link" style={{ paddingTop: 6 }}>← Voltar</Link>
      </div>

      <div className="filtchips" style={{ marginBottom: 16 }}>
        <Link className="fchip" href={`/spaces/${id}`} style={{ textDecoration: "none" }}>
          Mensagens
        </Link>
        <Link className="fchip" href={`/spaces/${id}?tab=todos`} style={{ textDecoration: "none" }}>
          Tarefas
        </Link>
        <span className="fchip on">Chat</span>
      </div>

      <ChatRoom
        spaceId={id}
        myId={user.id}
        canManageOrg={canManageOrg}
        nameById={nameById}
        todayIso={isoDate(today())}
        initialMessages={page.messages}
        initialHasMore={page.hasMore}
      />
    </>
  );
}
