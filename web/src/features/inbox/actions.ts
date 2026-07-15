"use server";

// Server Actions do Inbox. O Inbox não grava "signals" (é engine-derived): ele
// persiste STATUS por signal em `signal_overrides` (UNIQUE org_id,signal_key →
// upsert). "Atribuir Care" cria um care_item a partir do signal e marca o override
// como `assigned` (fecha o loop que a feature Care deixou diferido).
import { revalidatePath } from "next/cache";
import { requireOrg, can } from "@/lib/auth/session";
import { type ActionResult, done, fail, toMessage } from "@/lib/errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["seen", "snoozed", "dismissed"]);
const CARE_PRIORITIES = new Set(["celebration", "notice", "attention", "urgent"]);

// Persiste o status de um signal (Adiar=snoozed, Dispensar=dismissed, seen).
// upsert por (org_id, signal_key) — não duplica.
export async function setSignalStatusAction(fd: FormData): Promise<void> {
  const signalKey = String(fd.get("signalKey") ?? "").trim();
  const status = String(fd.get("status") ?? "");
  if (!signalKey || !STATUSES.has(status)) return;
  const { supabase, orgId } = await requireOrg();
  await supabase.from("signal_overrides").upsert(
    { org_id: orgId, signal_key: signalKey, status, updated_at: new Date().toISOString() },
    { onConflict: "org_id,signal_key" },
  );
  revalidatePath("/inbox");
}

// Cria um Care a partir de um Signal e marca o override como `assigned`.
// ⚠️ Inbox é engine-derived (sem linha em `signals`): `care_items.signal_id` fica
// NULL e o contexto do signal (título + porquês) vai no título/descrição/categoria
// do item — decisão documentada no README (handoff de Care/Inbox).
export async function assignCareFromSignalAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const signalKey = String(fd.get("signalKey") ?? "").trim();
  const title = String(fd.get("title") ?? "").trim();
  const stickId = String(fd.get("stickId") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const priorityRaw = String(fd.get("priority") ?? "");
  const priority = (CARE_PRIORITIES.has(priorityRaw) ? priorityRaw : "attention") as "celebration" | "notice" | "attention" | "urgent";
  if (!signalKey || !title) return fail("Signal inválido.");

  const ctx = await requireOrg();
  if (!can(ctx, "care.view")) return fail("Você não tem permissão para gerenciar Care.");
  try {
    const { error } = await ctx.supabase.from("care_items").insert({
      org_id: ctx.orgId,
      stick_id: UUID.test(stickId) ? stickId : null,
      signal_id: null, // engine-derived: sem linha em `signals` para referenciar
      category: "Signal",
      title,
      description: description || null,
      priority,
      status: "assigned",
      confidentiality_level: "standard",
      created_by: ctx.user.id,
    });
    if (error) return fail(toMessage(error, "Não consegui criar o Care."));
    await ctx.supabase.from("signal_overrides").upsert(
      { org_id: ctx.orgId, signal_key: signalKey, status: "assigned", updated_at: new Date().toISOString() },
      { onConflict: "org_id,signal_key" },
    );
    revalidatePath("/inbox");
    revalidatePath("/care");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}
