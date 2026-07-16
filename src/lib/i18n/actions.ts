"use server";

// Grava o idioma do usuário logado em `profiles.locale` (linha do próprio user;
// RLS `prof_update` já permite `id = auth.uid()`). Revalida o layout inteiro — o
// idioma afeta toda a UI. Isolado atrás deste helper (setLocale).
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { type ActionResult, done, fail, toMessage } from "@/lib/errors";
import { isLocale } from "./config";

export async function setLocaleAction(locale: string): Promise<ActionResult> {
  if (!isLocale(locale)) return fail("Idioma inválido.");
  const { supabase, user } = await requireUser();
  try {
    const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
    if (error) return fail(toMessage(error, "Não consegui salvar o idioma."));
    revalidatePath("/", "layout");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}
