import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/shared/LogoMark";
import { AcceptInvite } from "@/features/invites/components/AcceptInvite";

// Página PÚBLICA do convite (fora do dashboard, funciona deslogado). Só o root layout —
// mesma casca minimalista do login/onboarding. Não lê o convite do banco (o RLS de
// member_invites bloqueia quem não gerencia membros): explica de forma genérica, oferece
// entrar/criar conta e, já autenticado, aceita via a RPC. O token é o segredo do link.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/login?next=${encodeURIComponent(`/convite/${token}`)}`;

  return (
    <div className="gate">
      <div className="gcard">
        <LogoMark />
        <div className="gtitle">Convite para o Tally</div>

        {user ? (
          <AcceptInvite token={token} userEmail={user.email ?? "sua conta"} />
        ) : (
          <>
            <div className="gsub">
              Você foi convidado para participar de uma igreja no Tally. Entre ou crie sua conta para aceitar.
            </div>
            <Link className="gbtn" href={loginHref} style={{ display: "block", textDecoration: "none" }}>
              Entrar ou criar conta
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
