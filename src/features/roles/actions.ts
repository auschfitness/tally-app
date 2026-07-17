"use server";

// Server Actions de "Equipe e cargos". Toda ação: valida → sessão/org no servidor →
// checa `members.manage` → Supabase (RLS é a barreira real) → revalidate.
// Nunca confia em org/ids vindos do navegador.
//
// Excluir cargo de sistema NÃO é oferecido: o RLS (roles_delete) exige is_system=false.
// Atribuição de cargo grava `memberships.role_id` — a coluna legada `role` (texto) não
// é tocada. Ver docs/handoffs/assentos-papeis.md.
import { revalidatePath } from "next/cache";
import { requireOrg, can, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, done, fail, toMessage } from "@/lib/errors";
import { parseRoleInput } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DENIED = "Você não tem permissão para gerenciar equipe e cargos.";

// Guarda comum: sessão + capability. O RLS recusaria de qualquer jeito; isto dá uma
// mensagem clara em vez de um erro cru do banco.
async function requireManager(): Promise<{ ctx: OrgContext } | { error: ActionResult }> {
  const ctx = await requireOrg();
  if (!can(ctx, "members.manage")) return { error: fail(DENIED) };
  return { ctx };
}

function revalidateTeam(): void {
  revalidatePath("/settings");
  revalidatePath("/", "layout"); // o cargo pode mudar o que a pessoa enxerga na nav
}

export async function createRoleAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = parseRoleInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const guard = await requireManager();
  if ("error" in guard) return guard.error;
  const { ctx } = guard;
  try {
    const { error } = await ctx.supabase.from("roles").insert({
      org_id: ctx.orgId,
      name: parsed.data.name,
      permissions: parsed.data.permissions,
      is_system: false, // cargo personalizado: só estes podem ser excluídos depois
    });
    if (error) return fail(toMessage(error, "Não consegui criar o cargo."));
    revalidateTeam();
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Renomeia e/ou troca as permissões. Vale para cargo de sistema também (o RLS só
// proíbe EXCLUIR os de sistema, não editar).
export async function updateRoleAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return fail("Cargo inválido.");
  const parsed = parseRoleInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const guard = await requireManager();
  if ("error" in guard) return guard.error;
  const { ctx } = guard;
  try {
    const { error } = await ctx.supabase
      .from("roles")
      .update({ name: parsed.data.name, permissions: parsed.data.permissions })
      .eq("id", id)
      .eq("org_id", ctx.orgId);
    if (error) return fail(toMessage(error, "Não consegui salvar o cargo."));
    revalidateTeam();
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Exclui um cargo PERSONALIZADO. O banco recusa cargo de sistema (roles_delete exige
// is_system=false) e recusa cargo em uso (FK memberships.role_id) — devolvemos o
// motivo em vez de apagar em cascata o vínculo de alguém.
export async function deleteRoleAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return fail("Cargo inválido.");
  const guard = await requireManager();
  if ("error" in guard) return guard.error;
  const { ctx } = guard;
  try {
    const inUse = await ctx.supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId).eq("role_id", id);
    if ((inUse.count ?? 0) > 0) return fail("Este cargo está com alguém. Troque o cargo dessas pessoas antes de excluir.");

    const { error } = await ctx.supabase.from("roles").delete().eq("id", id).eq("org_id", ctx.orgId).eq("is_system", false);
    if (error) return fail(toMessage(error, "Não consegui excluir o cargo."));
    revalidateTeam();
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Atribui um cargo a um membro (memberships.role_id). "" = sem cargo.
// Gera timeline_events (DNA #4) — ver addRoleTimeline para a ressalva.
export async function assignRoleAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const membershipId = String(fd.get("membershipId") ?? "");
  if (!UUID.test(membershipId)) return fail("Membro inválido.");
  const raw = String(fd.get("roleId") ?? "");
  const roleId = raw === "" ? null : raw;
  if (roleId !== null && !UUID.test(roleId)) return fail("Cargo inválido.");
  const guard = await requireManager();
  if ("error" in guard) return guard.error;
  const { ctx } = guard;

  try {
    // Confere que o cargo é DESTA org antes de gravar: o RLS de `memberships` checa
    // members.manage na org do membro, mas não que o role_id pertença à mesma org.
    let roleName: string | null = null;
    if (roleId) {
      const role = await ctx.supabase.from("roles").select("name").eq("id", roleId).eq("org_id", ctx.orgId).maybeSingle();
      if (!role.data) return fail("Cargo inválido.");
      roleName = role.data.name;
    }

    const { data: updated, error } = await ctx.supabase
      .from("memberships")
      .update({ role_id: roleId })
      .eq("id", membershipId)
      .eq("org_id", ctx.orgId)
      .select("user_id")
      .maybeSingle();
    if (error) return fail(toMessage(error, "Não consegui atribuir o cargo."));
    if (!updated) return fail("Não consegui atribuir o cargo.");

    await addRoleTimeline(ctx, updated.user_id, roleName);
    revalidateTeam();
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Memória da igreja (DNA #4). RESSALVA: `timeline_events.stick_id` é NOT NULL e o banco
// não liga usuário ↔ Stick — casamos por e-mail (profiles.email → sticks.email). Se a
// pessoa da equipe não tiver uma Stick, a atribuição vale do mesmo jeito e só não gera
// evento. Nunca deixamos a Timeline derrubar a ação principal.
async function addRoleTimeline(ctx: OrgContext, userId: string, roleName: string | null): Promise<void> {
  try {
    const prof = await ctx.supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
    const email = prof.data?.email;
    if (!email) return;

    const stick = await ctx.supabase.from("sticks").select("id").eq("org_id", ctx.orgId).eq("email", email).maybeSingle();
    if (!stick.data) return;

    const who = prof.data?.full_name?.trim() || email;
    await ctx.supabase.from("timeline_events").insert({
      org_id: ctx.orgId,
      stick_id: stick.data.id,
      event_type: roleName ? "role_assigned" : "role_removed",
      source_module: "roles",
      title: roleName ? `Recebeu o cargo ${roleName}` : "Ficou sem cargo",
      summary: roleName ? `${who} agora tem o cargo ${roleName} na equipe.` : `${who} não tem mais um cargo na equipe.`,
      occurred_at: new Date().toISOString(),
      created_by: ctx.user.id,
    });
  } catch {
    // Timeline é side-effect: se falhar, o cargo já foi atribuído — não desfaz nada.
  }
}
