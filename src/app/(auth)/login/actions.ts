"use server";

// Server Actions de autenticação por e-mail+senha (padrão SSR por cookies).
// A sessão é escrita nos cookies pelo cliente do servidor; o redirect final é
// feito no servidor. Google OAuth é iniciado no navegador (ver LoginForm).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { studyOnlyRedirect } from "@/config/nav";

export type AuthState = { error: string | null; field?: "email" | "password" };

function readCredentials(formData: FormData): { email: string; password: string } | null {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return null;
  return { email, password };
}

// Destino pós-login. Só aceita caminho interno (começa com "/", não "//") — evita open
// redirect. Default: início do app. Usado no fluxo de convite (?next=/convite/token).
function safeNext(formData: FormData): string {
  const raw = String(formData.get("next") ?? "").trim();
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  // Modo só Estudo: redirect de server action não passa pelo middleware.
  return studyOnlyRedirect(path) ?? path;
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if (!creds) return { error: "Preencha e-mail e senha." };
  const next = safeNext(formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) {
    const m = error.message;
    if (m.includes("Invalid login credentials")) return { error: "E-mail ou senha incorretos.", field: "password" };
    if (m.includes("Email not confirmed")) return { error: "Confirme o e-mail pelo link que enviamos.", field: "email" };
    if (/invalid/i.test(m) && /email/i.test(m)) return { error: "E-mail inválido.", field: "email" };
    return { error: "Não foi possível entrar. Tente novamente." };
  }

  redirect(next);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if (!creds) return { error: "Preencha e-mail e senha." };
  const next = safeNext(formData);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(creds);
  if (error) {
    const m = error.message;
    if (/already registered/i.test(m)) return { error: "Este e-mail já tem conta. Entre com a senha.", field: "email" };
    if (m.includes("Password should be")) return { error: "A senha precisa ter pelo menos 6 caracteres.", field: "password" };
    if (/invalid/i.test(m) && /email/i.test(m)) return { error: "E-mail inválido.", field: "email" };
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // Com "Confirm email" desligado (config do Tally) já vem sessão → entra direto.
  if (data.session) redirect(next);

  return { error: "Conta criada. Se a confirmação de e-mail estiver ligada, confirme pelo link e depois entre." };
}
