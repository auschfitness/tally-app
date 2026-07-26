import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/(dashboard)/actions";
import { LogoMark } from "@/components/shared/LogoMark";

export const metadata: Metadata = { title: "Conta suspensa · Tally" };

// Tela de bloqueio para igrejas suspensas. Roda SÓ com requireUser (nunca requireOrg, que
// é justamente quem redireciona para cá — evita loop). Confere o status de verdade: quem
// não tem org vai para o onboarding; quem tem uma org ATIVA não deveria estar aqui, então
// volta para o app. Só a org suspensa vê a mensagem. Dá saída clara (Sair).
export default async function SuspendedPage() {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("memberships")
    .select("org_id, organizations(status)")
    .limit(1)
    .maybeSingle();

  if (!data) redirect("/onboarding");
  if (data.organizations?.status !== "suspended") redirect("/");

  return (
    <div className="gate">
      <div className="gcard" style={{ textAlign: "center" }}>
        <LogoMark />
        <h1 className="page" style={{ margin: "14px 0 8px" }}>
          Esta conta está suspensa
        </h1>
        <p className="sub" style={{ margin: "0 auto 20px", maxWidth: 380, lineHeight: 1.6 }}>
          O acesso da sua igreja ao Tally está temporariamente suspenso. Fale com o Tally para reativar a conta.
        </p>
        <form action={logoutAction}>
          <button className="btn ghost" type="submit">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
