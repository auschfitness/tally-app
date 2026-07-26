"use server";

// Server Actions do painel super-admin. Suspender/reativar uma igreja passa pela RPC
// SECURITY DEFINER admin_set_org_status, que valida o status e exige is_platform_admin()
// por dentro (a barreira real). Aqui a gente confere o formato, re-checa o admin no
// servidor (defesa em profundidade — nunca confiar no cliente) e revalida a lista.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { type ActionResult, done, fail, toMessage } from "@/lib/errors";
import { isPlatformAdmin } from "./queries";
import { isUuid, parseOrgStatus } from "./schema";

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
