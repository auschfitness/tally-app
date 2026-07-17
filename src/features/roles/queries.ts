// Consultas de "Equipe e cargos". RLS: `roles` SELECT = qualquer membro; `memberships`
// SELECT = membro da org; `profiles` SELECT = você ou quem compartilha org (shares_org).
// ⚠️ NÃO existe FK memberships.user_id → profiles, então o PostgREST não embute o perfil:
// buscamos os perfis à parte e juntamos aqui. Ver docs/handoffs/assentos-papeis.md.
import type { DB } from "@/lib/auth/session";
import type { MemberRow, RoleRow } from "./types";

export async function loadRoles(supabase: DB, orgId: string): Promise<RoleRow[]> {
  const [rolesRes, memRes] = await Promise.all([
    supabase.from("roles").select("id, name, permissions, is_system").eq("org_id", orgId).order("is_system", { ascending: false }).order("name"),
    supabase.from("memberships").select("role_id").eq("org_id", orgId),
  ]);

  const counts = new Map<string, number>();
  for (const m of memRes.data ?? []) {
    if (m.role_id) counts.set(m.role_id, (counts.get(m.role_id) ?? 0) + 1);
  }

  return (rolesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    permissions: r.permissions ?? [],
    is_system: r.is_system,
    memberCount: counts.get(r.id) ?? 0,
  }));
}

export async function loadMembers(supabase: DB, orgId: string, currentUserId: string): Promise<MemberRow[]> {
  const memRes = await supabase.from("memberships").select("id, user_id, is_owner, role_id").eq("org_id", orgId);
  const rows = memRes.data ?? [];
  if (rows.length === 0) return [];

  // Junção no app (sem FK): um SELECT em profiles pelos ids dos membros.
  const profRes = await supabase.from("profiles").select("id, full_name, email").in("id", rows.map((m) => m.user_id));
  const byId = new Map((profRes.data ?? []).map((p) => [p.id, p]));

  return rows
    .map((m): MemberRow => {
      const prof = byId.get(m.user_id);
      const email = prof?.email ?? "";
      return {
        id: m.id,
        userId: m.user_id,
        name: prof?.full_name?.trim() || email || "Sem nome",
        email,
        isOwner: m.is_owner,
        roleId: m.role_id,
        isSelf: m.user_id === currentUserId,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
