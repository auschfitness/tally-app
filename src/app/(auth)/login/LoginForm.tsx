"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signInAction, signUpAction, type AuthState } from "./actions";
import { PasswordInput } from "./PasswordInput";
import s from "./login.module.css";

const INITIAL: AuthState = { error: null };

export function LoginForm({ next = "/" }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [hideError, setHideError] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: AuthState, data: FormData) => {
      const result = await (mode === "login" ? signInAction : signUpAction)(prev, data);
      setHideError(false);
      return result;
    },
    INITIAL,
  );
  const [swapping, setSwapping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const error = hideError ? null : state.error;
  const field = error ? state.field : undefined;
  const login = mode === "login";
  const swap = `${s.swap} ${swapping ? s.swapping : ""}`;

  function toggleMode() {
    if (pending || swapping) return;
    setHideError(true);
    setSwapping(true);
    timer.current = setTimeout(() => {
      setMode(login ? "signup" : "login");
      setSwapping(false);
    }, 150);
  }

  async function handleGoogle() {
    const supabase = createClient();
    const cb = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: cb },
    });
  }

  return (
    <form action={formAction} className={s.form}>
      <h1 className={`${s.title} ${swap}`}>{login ? "Entrar" : "Criar conta"}</h1>
      <p className={`${s.sub} ${swap}`}>
        {login ? "Bem-vindo de volta. Continue de onde parou." : "Leva menos de um minuto."}
      </p>

      <input type="hidden" name="next" value={next} />
      <label className={s.field} data-invalid={field === "email"}>
        E-mail
        <input
          name="email"
          type="email"
          placeholder="E-mail"
          autoComplete="email"
          aria-invalid={field === "email"}
          aria-describedby={field === "email" ? "auth-error" : undefined}
          required
        />
      </label>
      <label className={s.field} data-invalid={field === "password"}>
        Senha
        <PasswordInput
          name="password"
          placeholder="Senha"
          autoComplete={login ? "current-password" : "new-password"}
          aria-invalid={field === "password"}
          aria-describedby={field === "password" ? "auth-error" : undefined}
          required
        />
      </label>
      {login && (
        <Link href="/esqueci-senha" className={s.forgot}>
          Esqueci a senha
        </Link>
      )}

      <div id="auth-error" className={s.err} role="alert" data-on={!!error}>{error ?? ""}</div>

      <button className={s.btn} type="submit" disabled={pending}>
        {pending ? "Aguarde..." : login ? "Entrar" : "Criar conta"}
      </button>

      <div className={s.or}>ou</div>

      <button className={s.google} type="button" onClick={handleGoogle} disabled={pending}>
        <GoogleIcon />
        Continuar com Google
      </button>

      <p className={s.switch}>
        {login ? "Não tem conta? " : "Já tem conta? "}
        <button type="button" onClick={toggleMode} disabled={pending || swapping}>
          {login ? "Cadastre-se" : "Entrar"}
        </button>
      </p>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
