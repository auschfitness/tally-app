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
import { parseFiscalInput, profileToColumns } from "./fiscal";
import { canManageFiscal } from "./access";

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

// Renomeia um campus (tabela campuses). O nome é referência denormalizada em alguns
// lugares (ex.: finance_entries lê campus por id → seguro; presença por id → seguro).
export async function renameCampusAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return fail("Campus inválido.");
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return fail("Dê um nome ao campus.");
  const ctx = await requireOrg();
  try {
    const { error } = await ctx.supabase.from("campuses").update({ name }).eq("id", id).eq("org_id", ctx.orgId);
    if (error) return fail(toMessage(error, "Não consegui renomear o campus."));
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Ativa/desativa um campus (campuses.active). Desativar retira o campus do seletor e
// dos filtros SEM apagar histórico — o caminho certo para uma filial que fechou. Guarda:
// nunca deixar a org sem nenhum campus ativo (o seletor/os filtros ficariam vazios).
export async function setCampusActiveAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return fail("Campus inválido.");
  const active = String(fd.get("active") ?? "") === "1";
  const ctx = await requireOrg();
  try {
    if (!active) {
      const { count } = await ctx.supabase
        .from("campuses")
        .select("id", { count: "exact", head: true })
        .eq("org_id", ctx.orgId)
        .eq("active", true)
        .neq("id", id);
      if ((count ?? 0) === 0) return fail("Mantenha ao menos um campus ativo.");
    }
    const { error } = await ctx.supabase.from("campuses").update({ active }).eq("id", id).eq("org_id", ctx.orgId);
    if (error) return fail(toMessage(error, "Não consegui atualizar o campus."));
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

// Salva os dados jurídicos da matriz (target="org" → org_fiscal_profiles) ou de uma
// filial (target=campus_id → campus_fiscal_profiles). Upsert pela PK (org_id/campus_id).
// Escrita gated por canManageFiscal + RLS.
export async function saveFiscalAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const target = String(fd.get("target") ?? "org");
  const ctx = await requireOrg();
  if (!canManageFiscal(ctx)) return fail("Você não tem permissão para editar os dados jurídicos.");

  const cols = profileToColumns(parseFiscalInput(fd));
  const meta = { updated_by: ctx.user.id, updated_at: new Date().toISOString() };
  try {
    if (target === "org") {
      const { error } = await ctx.supabase.from("org_fiscal_profiles").upsert({ org_id: ctx.orgId, ...cols, ...meta });
      if (error) return fail(toMessage(error, "Não consegui salvar os dados jurídicos."));
    } else {
      if (!UUID.test(target)) return fail("Campus inválido.");
      const { error } = await ctx.supabase.from("campus_fiscal_profiles").upsert({ campus_id: target, org_id: ctx.orgId, ...cols, ...meta });
      if (error) return fail(toMessage(error, "Não consegui salvar os dados jurídicos."));
    }
    revalidatePath("/settings");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Conta do usuário: nome (profiles.full_name, linha própria) + idioma/fuso (blob).
export async function updateAccountAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const d = parseAccountInput(fd);
  const ctx = await requireOrg();
  try {
    if (d.fullName) {
      // UPSERT (não UPDATE): auto-cura se a linha do perfil faltar (o gatilho
      // handle_new_user já a cria no cadastro; isto é defesa para linhas ausentes).
      const { error } = await ctx.supabase.from("profiles").upsert({ id: ctx.user.id, full_name: d.fullName });
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
