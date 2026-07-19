// Consultas dos convites de membro. O RLS de member_invites exige has_perm(org,
// 'members.manage') para ler/escrever — quem não gerencia membros não enxerga nada aqui
// (a página trata o estado bloqueado). O filtro explícito por org_id é defesa em
// profundidade. Duas leituras: a lista de convites (gestão) e o conjunto de fichas com
// convite pendente (indicador na tela de Sticks).
import type { DB } from "@/lib/auth/session";
import { effectiveStatus, isExpired } from "./domain";
import type { InviteView } from "./types";

// Todos os convites da org, do mais novo ao mais antigo, com o nome da pessoa resolvido e
// o status EFETIVO (pending vencido → expired). `nowIso` decide a expiração.
export async function listInvites(supabase: DB, orgId: string, nowIso: string): Promise<InviteView[]> {
  const { data: rows } = await supabase
    .from("member_invites")
    .select("id, stick_id, email, token, status, expires_at, accepted_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const invites = rows ?? [];
  if (invites.length === 0) return [];

  const stickIds = [...new Set(invites.map((i) => i.stick_id))];
  const { data: sticks } = await supabase
    .from("sticks")
    .select("id, full_name")
    .eq("org_id", orgId)
    .in("id", stickIds);
  const nameById = new Map((sticks ?? []).map((s) => [s.id, s.full_name]));

  return invites.map((i) => ({
    id: i.id,
    stickId: i.stick_id,
    personName: nameById.get(i.stick_id) ?? "Pessoa",
    email: i.email,
    token: i.token,
    status: effectiveStatus(i.status, i.expires_at, nowIso),
    rawStatus: i.status,
    expiresAt: i.expires_at,
    acceptedAt: i.accepted_at,
    createdAt: i.created_at,
  }));
}

// Ids das fichas com convite EFETIVAMENTE pendente (status pending e ainda no prazo). Usado
// só para o indicador na tela de Sticks. Se o usuário não gerencia membros, o RLS devolve
// vazio — o indicador simplesmente não aparece.
export async function pendingInviteStickIds(supabase: DB, orgId: string, nowIso: string): Promise<string[]> {
  const { data } = await supabase
    .from("member_invites")
    .select("stick_id, expires_at")
    .eq("org_id", orgId)
    .eq("status", "pending");
  return (data ?? []).filter((i) => !isExpired(i.expires_at, nowIso)).map((i) => i.stick_id);
}
