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
  roleId: string | null; // cargo atual (roles.id); null = sem cargo atribuído
  roleName: string | null; // nome do cargo (ex.: "Pastor"), para exibir na UI
  permissions: string[]; // UNIÃO: permissões do próprio membership + as do cargo
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
  // O cargo vem embutido (FK memberships.role_id → roles). As permissões efetivas
  // são a UNIÃO das do membership com as do cargo — é assim que o has_perm do banco
  // decide (m26). Ler só `memberships.permissions` faria a UI esconder telas que o
  // RLS libera (ex.: quem é Pastor pelo cargo, sem permissão avulsa).
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id, is_owner, role, permissions, role_id, roles(name, permissions)")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) redirect("/onboarding");

  const roleRow = data.roles;
  return {
    supabase,
    user,
    orgId: data.org_id,
    isOwner: data.is_owner,
    role: data.role,
    roleId: data.role_id,
    roleName: roleRow?.name ?? null,
    permissions: [...new Set([...(data.permissions ?? []), ...(roleRow?.permissions ?? [])])],
  };
}

// Autorização por capability (espelha has_perm no banco; o RLS continua sendo a
// barreira real). Owner tem tudo. Use em Actions antes de mutar dados sensíveis.
export function can(ctx: OrgContext, permission: string): boolean {
  return ctx.isOwner || ctx.permissions.includes(permission);
}
