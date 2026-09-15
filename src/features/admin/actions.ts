"use server";

// Server Actions do painel super-admin. Suspender/reativar uma igreja passa pela RPC
// SECURITY DEFINER admin_set_org_status, que valida o status e exige is_platform_admin()
// por dentro (a barreira real). Aqui a gente confere o formato, re-checa o admin no
// servidor (defesa em profundidade — nunca confiar no cliente) e revalida a lista.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { type ActionResult, done, fail, toMessage } from "@/lib/errors";
import { isFlagKey, parseRollout } from "@/features/flags/catalog";
import { isPlatformAdmin } from "./queries";
import { isUuid, parseOrgStatus, parseOrgPlan } from "./schema";

const DENIED = "Acesso restrito ao Tally.";

// Aplica um novo status ('active' | 'suspended') a uma igreja.
export async function setOrgStatusAction(orgId: string, status: string): Promise<ActionResult> {
  if (!isUuid(orgId)) return fail("Igreja inválida.");
  const target = parseOrgStatus(status);
  if (!target) return fail("Status inválido.");

  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) return fail(DENIED);

  try {
    const { error } = await supabase.rpc("admin_set_org_status", { p_org: orgId, p_status: target });
    if (error) return fail(toMessage(error, "Não consegui atualizar o status da igreja."));
    revalidatePath("/admin");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Aplica um novo plano ('free' | 'pro') a uma igreja. Passa pela RPC SECURITY DEFINER
// admin_set_org_plan (m50), que exige is_platform_admin() por dentro — barreira real.
export async function setOrgPlanAction(orgId: string, plan: string): Promise<ActionResult> {
  if (!isUuid(orgId)) return fail("Igreja inválida.");
  const target = parseOrgPlan(plan);
  if (!target) return fail("Plano inválido.");

  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) return fail(DENIED);

  try {
    const { error } = await supabase.rpc("admin_set_org_plan", { p_org: orgId, p_plan: target });
    if (error) return fail(toMessage(error, "Não consegui atualizar o plano da igreja."));
    revalidatePath("/admin");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Alcance global de uma feature flag. `enabled` acompanha o alcance: só 'all' vale para
// todas as igrejas — 'orgs' depende de override e 'off' não vale para ninguém. A RPC
// admin_set_flag exige is_platform_admin() por dentro (barreira real).
export async function setFlagAction(key: string, rollout: string): Promise<ActionResult> {
  if (!isFlagKey(key)) return fail("Flag desconhecida.");
  const target = parseRollout(rollout);
  if (!target) return fail("Alcance inválido.");

  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) return fail(DENIED);

  try {
    const { error } = await supabase.rpc("admin_set_flag", {
      p_key: key,
      p_enabled: target === "all",
      p_rollout: target,
    });
    if (error) return fail(toMessage(error, "Não consegui atualizar a flag."));
    revalidatePath("/admin/flags");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Override da flag para UMA igreja (o caminho normal: ligar na igreja de teste, validar,
// só então levar o alcance global para 'all').
export async function setFlagOrgAction(key: string, orgId: string, enabled: boolean): Promise<ActionResult> {
  if (!isFlagKey(key)) return fail("Flag desconhecida.");
  if (!isUuid(orgId)) return fail("Igreja inválida.");

  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) return fail(DENIED);

  try {
    const { error } = await supabase.rpc("admin_set_flag_org", {
      p_key: key,
      p_org: orgId,
      p_enabled: enabled,
    });
    if (error) return fail(toMessage(error, "Não consegui atualizar a flag nesta igreja."));
    revalidatePath("/admin/flags");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}
