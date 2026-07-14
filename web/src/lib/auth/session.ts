// Guarda de sessão e de organização no SERVIDOR. Toda página protegida e toda
// Server Action passa por aqui: a autorização nunca vem do navegador.
//
//  - requireUser(): garante usuário autenticado (senão → /login).
//  - requireOrg():  garante que o usuário pertence a uma org (senão → /onboarding),
//                   devolvendo o org_id, o papel e as permissões — TODOS derivados
//                   no servidor a partir de `memberships`, nunca aceitos do cliente.
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// O tipo do cliente é derivado do próprio createClient (evita divergência de
// parâmetros genéricos do SupabaseClient entre versões).
export type DB = Awaited<ReturnType<typeof createClient>>;

export interface UserContext {
  supabase: DB;
  user: User;
}

export interface OrgContext extends UserContext {
  orgId: string;
  isOwner: boolean;
  role: string;
  permissions: string[];
}

export async function requireUser(): Promise<UserContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireOrg(): Promise<OrgContext> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id, is_owner, role, permissions")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) redirect("/onboarding");

  return {
    supabase,
    user,
    orgId: data.org_id,
    isOwner: data.is_owner,
    role: data.role,
    permissions: data.permissions ?? [],
  };
}

// Autorização por capability (espelha has_perm no banco; o RLS continua sendo a
// barreira real). Owner tem tudo. Use em Actions antes de mutar dados sensíveis.
export function can(ctx: OrgContext, permission: string): boolean {
  return ctx.isOwner || ctx.permissions.includes(permission);
}
