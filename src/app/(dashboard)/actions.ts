"use server";

// Ações da casca do app. logout invalida a sessão no servidor (e limpa cookies);
// setTheme guarda a preferência num cookie (SSR-safe, sem flash) — só preferência
// local, nunca dado sensível (spec §Estado).
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setThemeAction(theme: "light" | "dark"): Promise<void> {
  const store = await cookies();
  store.set("tally-theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
