"use server";

// Server Action do seletor de campus: grava o campus ativo no cookie global e
// revalida o layout para todas as telas relerem o novo contexto. Não valida contra
// a lista aqui (o RLS isola por org e cada tela valida o nome contra os seus campi
// ativos ao resolver) — é só uma preferência de visualização.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CAMPUS_COOKIE } from "@/lib/campus";

export async function setActiveCampusAction(name: string): Promise<void> {
  const value = String(name ?? "").trim();
  if (!value) return;
  const jar = await cookies();
  jar.set(CAMPUS_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  revalidatePath("/", "layout");
}
