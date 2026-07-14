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

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if (!creds) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { error: error.message };

  redirect("/");
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if (!creds) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(creds);
  if (error) return { error: error.message };

  // Com "Confirm email" desligado (config do Tally) já vem sessão → entra direto.
  if (data.session) redirect("/");

  return { error: "Conta criada. Se a confirmação de e-mail estiver ligada, confirme pelo link e depois entre." };
}
