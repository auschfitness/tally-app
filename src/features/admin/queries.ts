// Consultas do painel super-admin (Tally sobre TODAS as igrejas). TODA leitura passa
// pelas RPCs SECURITY DEFINER já gated (is_platform_admin() por dentro): o super-admin
// NÃO ganha RLS relaxado — lê só AGREGADOS, nunca tabelas sensíveis cross-org
// (doações/mensagens/Care ficam fechadas pelo RLS por org). Se o caller não for
// platform-admin, as admin_* levantam forbidden (42501) e is_platform_admin() → false.
import type { DB } from "@/lib/auth/session";
import { coerceOrgStatus, type PlatformStats } from "./domain";
import type { AdminOrg } from "./types";

// É o usuário logado um admin da plataforma? Defensivo: qualquer erro → false (nega).
export async function isPlatformAdmin(supabase: DB): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
}

const EMPTY_STATS: PlatformStats = { orgs: 0, members: 0, sticks: 0, active: 0, suspended: 0 };

// Totais do cabeçalho. A RPC devolve uma tabela de UMA linha; sem linha → zeros.
export async function loadPlatformStats(supabase: DB): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc("admin_platform_stats");
  const row = data?.[0];
  if (error || !row) return EMPTY_STATS;
  return {
    orgs: row.orgs,
    members: row.members,
    sticks: row.sticks,
    active: row.active,
    suspended: row.suspended,
  };
}

// Todas as igrejas com suas contagens, mapeadas para o modelo de front. A ordenação e o
// filtro finais são no cliente (domain.ts) — aqui só a leitura crua.
export async function loadAdminOrgs(supabase: DB): Promise<AdminOrg[]> {
  const { data, error } = await supabase.rpc("admin_list_orgs");
  if (error || !data) return [];
  return data.map((o) => ({
    orgId: o.org_id,
    name: o.name,
    country: o.country,
    currency: o.currency,
    status: coerceOrgStatus(o.status),
    plan: o.plan,
    createdAt: o.created_at,
    members: o.members,
    sticks: o.sticks,
    groups: o.groups,
  }));
}
