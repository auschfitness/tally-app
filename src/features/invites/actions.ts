"use server";

// Server Actions dos convites de membro. Convidar/revogar/gerar novo link exigem
// members.manage (o RLS de member_invites é a barreira real: has_perm(org,'members.manage')).
// Aceitar é do próprio convidado (só authenticated) e passa pela RPC SECURITY DEFINER
// accept_member_invite, que valida o token, liga sticks.user_id e cria a membership.
// O token do convite tem default no banco — NÃO geramos token no app; inserimos e lemos
// o token de volta.
import { revalidatePath } from "next/cache";
import { requireOrg, requireUser, can } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";

const DENIED = "Você não tem permissão para gerenciar membros.";
const UNIQUE_VIOLATION = "23505"; // já existe um convite pendente para a ficha (índice parcial)

// Convida uma ficha para o app: cria o member_invites e devolve o token (para montar o
// link). A ficha precisa ter e-mail e ainda não ter conta ligada.
export async function createInvite(stickId: string): Promise<ActionResult<{ token: string }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "members.manage")) return fail(DENIED);
  const { supabase, orgId, user } = ctx;

  try {
    const { data: stick } = await supabase
      .from("sticks")
      .select("id, email, user_id")
      .eq("org_id", orgId)
      .eq("id", stickId)
      .maybeSingle();
    if (!stick) return fail("Pessoa não encontrada.");
    if (stick.user_id) return fail("Esta pessoa já tem acesso ao app.");
    const email = (stick.email ?? "").trim();
    if (!email) return fail("Adicione um e-mail a esta pessoa antes de convidar.");

    const { data, error } = await supabase
      .from("member_invites")
      .insert({ org_id: orgId, stick_id: stickId, email, invited_by: user.id })
      .select("token")
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return fail("Já existe um convite pendente para esta pessoa.");
      return fail(toMessage(error, "Não consegui criar o convite."));
    }
    if (!data) return fail("Não consegui criar o convite.");

    revalidatePath("/members");
    revalidatePath("/sticks");
    return ok({ token: data.token });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Revoga um convite pendente (status → revoked).
export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "members.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;

  try {
    const { error } = await supabase
      .from("member_invites")
      .update({ status: "revoked" })
      .eq("org_id", orgId)
      .eq("id", inviteId)
      .eq("status", "pending"); // só faz sentido revogar um pendente
    if (error) return fail(toMessage(error, "Não consegui revogar o convite."));

    revalidatePath("/members");
    revalidatePath("/sticks");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Gera um novo link para um convite vencido: encerra o antigo (status → expired, libera o
// índice de "um pendente por ficha") e cria um convite novo para a mesma pessoa. Devolve o
// novo token.
export async function regenerateInvite(inviteId: string): Promise<ActionResult<{ token: string }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "members.manage")) return fail(DENIED);
  const { supabase, orgId, user } = ctx;

  try {
    const { data: old } = await supabase
      .from("member_invites")
      .select("id, stick_id, email, status")
      .eq("org_id", orgId)
      .eq("id", inviteId)
      .maybeSingle();
    if (!old) return fail("Convite não encontrado.");

    // Encerra o antigo (se ainda pendente na coluna) para liberar o índice parcial.
    if (old.status === "pending") {
      const { error: expErr } = await supabase
        .from("member_invites")
        .update({ status: "expired" })
        .eq("org_id", orgId)
        .eq("id", inviteId);
      if (expErr) return fail(toMessage(expErr, "Não consegui atualizar o convite antigo."));
    }

    const { data, error } = await supabase
      .from("member_invites")
      .insert({ org_id: orgId, stick_id: old.stick_id, email: old.email, invited_by: user.id })
      .select("token")
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return fail("Já existe um convite pendente para esta pessoa.");
      return fail(toMessage(error, "Não consegui gerar um novo link."));
    }
    if (!data) return fail("Não consegui gerar um novo link.");

    revalidatePath("/members");
    revalidatePath("/sticks");
    return ok({ token: data.token });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Aceita um convite. Só authenticated. A RPC valida o token/prazo, liga a conta à ficha e
// cria a membership com o papel "Membro"; devolve o org_id. Mapeia os erros conhecidos.
export async function acceptInvite(token: string): Promise<ActionResult<{ orgId: string }>> {
  const { supabase } = await requireUser();
  try {
    const { data, error } = await supabase.rpc("accept_member_invite", { p_token: token });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("invite_invalid_or_expired")) return fail("Convite inválido ou expirado.");
      if (msg.includes("not_authenticated")) return fail("Entre na sua conta para aceitar o convite.");
      return fail(toMessage(error, "Não consegui aceitar o convite."));
    }
    if (!data) return fail("Convite inválido ou expirado.");
    return ok({ orgId: data });
  } catch (e) {
    return fail(toMessage(e));
  }
}
