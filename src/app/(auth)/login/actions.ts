"use server";

// Server Actions de autenticação por e-mail+senha (padrão SSR por cookies).
// A sessão é escrita nos cookies pelo cliente do servidor; o redirect final é
// feito no servidor. Google OAuth é iniciado no navegador (ver LoginForm).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null };

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
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if (!creds) return { error: "Preencha e-mail e senha." };
  const next = safeNext(formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { error: error.message };

  redirect(next);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if (!creds) return { error: "Preencha e-mail e senha." };
  const next = safeNext(formData);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(creds);
  if (error) return { error: error.message };

  // Com "Confirm email" desligado (config do Tally) já vem sessão → entra direto.
  if (data.session) redirect(next);

  return { error: "Conta criada. Se a confirmação de e-mail estiver ligada, confirme pelo link e depois entre." };
}
