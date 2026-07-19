import { requireOrg, can } from "@/lib/auth/session";
import { listInvites } from "@/features/invites/queries";
import { InvitesManager } from "@/features/invites/components/InvitesManager";

// Convites de membro (Server Component). Gestão dos acessos ao app: pendentes, expirados,
// aceitos. Só quem tem members.manage escreve — e o RLS de member_invites já esconde tudo
// de quem não gerencia, então a página mostra um estado bloqueado nesse caso.
export default async function MembersPage() {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;

  if (!can(ctx, "members.manage")) {
    return (
      <>
        <h1 className="page">Membros</h1>
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="empty" style={{ lineHeight: 1.6 }}>
            Você não tem permissão para gerenciar membros.
            <br />
            <span className="muted">Peça a quem administra a igreja.</span>
          </div>
        </div>
      </>
    );
  }

  const invites = await listInvites(supabase, orgId, new Date().toISOString());

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <h1 className="page">Membros</h1>
        <p className="sub" style={{ margin: 0 }}>
          Convide pessoas para acessarem o app e acompanhe os convites.
        </p>
      </div>
      <InvitesManager invites={invites} />
    </>
  );
}
