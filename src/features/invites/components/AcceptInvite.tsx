"use client";

// Aceite do convite (Client). Só aparece para quem já está logado. Chama a Server Action
// acceptInvite (que passa pela RPC SECURITY DEFINER) e, no sucesso, entra no app. Erros
// conhecidos ("Convite inválido ou expirado") são mostrados com texto claro. Também
// permite trocar de conta, caso a pessoa esteja logada com outro usuário.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "../actions";

export function AcceptInvite({ token, userEmail }: { token: string; userEmail: string }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function accept() {
    setAccepting(true);
    setErr(null);
    const res = await acceptInvite(token);
    if (res.success) {
      router.replace("/");
    } else {
      setAccepting(false);
      setErr(res.message);
    }
  }

  async function switchAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/login?next=${encodeURIComponent(`/convite/${token}`)}`;
  }

  return (
    <>
      <div className="gsub" style={{ marginBottom: 14 }}>
        Você está logado como <b>{userEmail}</b>. Aceite para entrar na igreja.
      </div>
      <div className="gerr">{err ?? ""}</div>
      <button className="gbtn" type="button" onClick={accept} disabled={accepting}>
        {accepting ? "Aceitando…" : "Aceitar convite"}
      </button>
      <div className="gswitch">
        Não é você? <a onClick={switchAccount}>Entrar com outra conta</a>
      </div>
    </>
  );
}
