"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error: string | null; expired?: boolean };

export async function updatePasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };
  if (password !== confirm) return { error: "As senhas não são iguais." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Link expirado. Peça um novo.", expired: true };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password"
    ? "Escolha uma senha diferente da atual."
    : "Não foi possível salvar a senha. Tente novamente." };
  redirect("/");
}
