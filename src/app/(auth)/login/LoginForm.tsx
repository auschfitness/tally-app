"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signInAction, signUpAction, type AuthState } from "./actions";

const INITIAL: AuthState = { error: null };

export function LoginForm({ next = "/" }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, pending] = useActionState(
    mode === "login" ? signInAction : signUpAction,
    INITIAL,
  );

  async function handleGoogle() {
    const supabase = createClient();
    const cb = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: cb },
    });
  }

  return (
    <form action={formAction}>
      <div className="gtitle">Tally</div>
      <div className="gsub">{mode === "login" ? "Entre na sua conta" : "Crie a sua conta"}</div>

      <input type="hidden" name="next" value={next} />
      <div className="gfield">
        <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
      </div>
      <div className="gfield">
        <input
          name="password"
          type="password"
          placeholder="Senha"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </div>

      <div className="gerr">{state.error ?? ""}</div>

      <button className="gbtn" type="submit" disabled={pending}>
        {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
      </button>
      <button className="gbtn goauth" type="button" onClick={handleGoogle} disabled={pending}>
        Continuar com Google
      </button>

      <div className="gswitch">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <a onClick={() => setMode("signup")}>Cadastre-se</a>
          </>
        ) : (
          <>
            Já tem conta? <a onClick={() => setMode("login")}>Entrar</a>
          </>
        )}
      </div>
    </form>
  );
}
