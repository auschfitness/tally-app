"use server";

// Server Actions de Settings. Cada campo grava na SUA fonte:
//  - nome/moeda da org → `organizations` (RLS is_org_member: qualquer membro pode;
//    restringir a owner é migração do orquestrador)
//  - campi → `campuses` (add/remove; remover falha se o campus estiver em uso — FK)
//  - nome do usuário → `profiles.full_name` (linha do próprio user)
//  - multi-instituição / idioma / fuso → blob `app_state.data.*` com escrita
//    CIRÚRGICA (read-modify-write da sub-chave; NUNCA sobrescrever o blob todo).
// Ver docs/handoffs/settings-supabase.md.
import { revalidatePath } from "next/cache";
import { requireOrg, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, done, fail, toMessage } from "@/lib/errors";
import { parseAccountInput, parseOrgInput } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Escrita cirúrgica no blob app_state: lê `data`, muta SÓ a sub-chave, grava de
// volta preservando tudo que outras features guardam ali (padrão de Teams/Services).
async function patchAppState(ctx: OrgContext, patch: (data: Record<string, unknown>) => void): Promise<void> {
  const cur = await ctx.supabase.from("app_state").select("data").eq("org_id", ctx.orgId).maybeSingle();
  const data: Record<string, unknown> = cur.data?.data && typeof cur.data.data === "object" ? { ...(cur.data.data as Record<string, unknown>) } : {};
  patch(data);
  await ctx.supabase.from("app_state").upsert({
    org_id: ctx.orgId,
    data: data as never,
    updated_at: new Date().toISOString(),
    updated_by: ctx.user.id,
  });
}

// Nome + moeda da org (tabela organizations). Finance já lê organizations.currency.
export async function updateOrgAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = parseOrgInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const { error } = await ctx.supabase.from("organizations").update({ name: parsed.data.name, currency: parsed.data.currency }).eq("id", ctx.orgId);
    if (error) return fail(toMessage(error, "Não consegui salvar a instituição."));
    revalidatePath("/settings");
    revalidatePath("/", "layout"); // nome/moeda aparecem no Topbar/Finance
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Adiciona um campus (tabela campuses).
export async function addCampusAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return fail("Dê um nome ao campus.");
  const ctx = await requireOrg();
  try {
    const { error } = await ctx.supabase.from("campuses").insert({ org_id: ctx.orgId, name });
    if (error) return fail(toMessage(error, "Não consegui adicionar o campus."));
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Remove um campus. Se estiver em uso (FK de sticks/serviços/etc.), o banco recusa —
// devolvemos um erro claro em vez de apagar em cascata.
export async function removeCampusAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return fail("Campus inválido.");
  const ctx = await requireOrg();
  try {
    const { error } = await ctx.supabase.from("campuses").delete().eq("id", id).eq("org_id", ctx.orgId);
    if (error) return fail(toMessage(error, "Não removi: este campus está em uso (pessoas, cultos ou eventos)."));
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Multi-instituição (blob). SÓ o owner pode ativar (paridade com o legado).
export async function setMultiInstitutionAction(fd: FormData): Promise<void> {
  const on = String(fd.get("value") ?? "") === "1";
  const ctx = await requireOrg();
  if (!ctx.isOwner) return; // só o dono; a UI já esconde o controle para não-owner
  await patchAppState(ctx, (data) => {
    const inst = data.institution && typeof data.institution === "object" ? { ...(data.institution as Record<string, unknown>) } : {};
    inst.multiInstitution = on;
    data.institution = inst;
  });
  revalidatePath("/settings");
}

// Conta do usuário: nome (profiles.full_name, linha própria) + idioma/fuso (blob).
export async function updateAccountAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const d = parseAccountInput(fd);
  const ctx = await requireOrg();
  try {
    if (d.fullName) {
      const { error } = await ctx.supabase.from("profiles").update({ full_name: d.fullName }).eq("id", ctx.user.id);
      if (error) return fail(toMessage(error, "Não consegui salvar seu nome."));
    }
    await patchAppState(ctx, (data) => {
      const acc = data.account && typeof data.account === "object" ? { ...(data.account as Record<string, unknown>) } : {};
      acc.timezone = d.timezone; // idioma NÃO vai no blob — é profiles.locale (setLocaleAction)
      data.account = acc;
    });
    revalidatePath("/settings");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}
