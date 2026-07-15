"use server";

// Server Actions de Cultos: CRUD de culto, CRUD + reordenação da ordem do culto, e
// registro de presença (via o caminho COMPARTILHADO lib/attendance, context='service').
// Valida → sessão/org no servidor → Supabase (RLS) → revalidate.
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, done, fail, toMessage } from "@/lib/errors";
import { ensureCampusId, recordAttendance } from "@/lib/attendance";
import { isoDate, today } from "@/lib/utils/date";
import { parsePlanItemInput, parseServiceInput } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function campusIdForName(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const res = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  return res.data?.id ?? null;
}

// --- Cultos ---
export async function createServiceAction(_prev: ActionResult<{ id: string }>, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = parseServiceInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    const campus_id = await campusIdForName(supabase, orgId, parsed.data.campus);
    const { data, error } = await supabase
      .from("services")
      .insert({
        org_id: orgId,
        name: parsed.data.name,
        type: parsed.data.type || null,
        campus_id,
        weekday: parsed.data.weekday,
        start_time: parsed.data.start_time || null,
        end_time: parsed.data.end_time || null,
        location: parsed.data.location || null,
        recurring_pattern: parsed.data.recurring_pattern,
        description: parsed.data.description || null,
        active: parsed.data.active,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar o culto."));
    revalidatePath("/services");
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateServiceAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const parsed = parseServiceInput(fd);
  if (!id) return fail("Culto inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    const campus_id = await campusIdForName(supabase, orgId, parsed.data.campus);
    const { error } = await supabase
      .from("services")
      .update({
        name: parsed.data.name,
        type: parsed.data.type || null,
        campus_id,
        weekday: parsed.data.weekday,
        start_time: parsed.data.start_time || null,
        end_time: parsed.data.end_time || null,
        location: parsed.data.location || null,
        recurring_pattern: parsed.data.recurring_pattern,
        description: parsed.data.description || null,
        active: parsed.data.active,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar o culto."));
    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// DESTRUTIVO: service_plan_items.service_id e schedule_assignments.service_id →
// ON DELETE CASCADE (apaga liturgia e escalas do culto). As presenças
// (attendance_sessions.context_id) NÃO têm FK → ficam, mas sem vínculo com o culto.
export async function deleteServiceAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { supabase } = await requireOrg();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/services");
}

// --- Ordem do culto (service_plan_items) ---
export async function createPlanItemAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const serviceId = String(fd.get("serviceId") ?? "");
  const parsed = parsePlanItemInput(fd);
  if (!UUID.test(serviceId)) return fail("Culto inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    // próxima position no fim do template
    const existing = await supabase
      .from("service_plan_items")
      .select("position")
      .eq("org_id", orgId)
      .eq("service_id", serviceId)
      .is("session_id", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (existing.data?.position ?? 0) + 1;
    const { error } = await supabase.from("service_plan_items").insert({
      org_id: orgId,
      service_id: serviceId,
      position,
      time_label: parsed.data.timeLabel || null,
      title: parsed.data.title,
      duration_min: parsed.data.durationMin,
      responsible: parsed.data.responsible || null,
      notes: parsed.data.notes || null,
    });
    if (error) return fail(toMessage(error, "Não consegui adicionar o item."));
    revalidatePath(`/services/${serviceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updatePlanItemAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const serviceId = String(fd.get("serviceId") ?? "");
  const parsed = parsePlanItemInput(fd);
  if (!UUID.test(id)) return fail("Item inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase } = await requireOrg();
  try {
    const { error } = await supabase
      .from("service_plan_items")
      .update({
        time_label: parsed.data.timeLabel || null,
        title: parsed.data.title,
        duration_min: parsed.data.durationMin,
        responsible: parsed.data.responsible || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar o item."));
    if (UUID.test(serviceId)) revalidatePath(`/services/${serviceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function deletePlanItemAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  const serviceId = String(fd.get("serviceId") ?? "");
  if (!UUID.test(id)) return;
  const { supabase } = await requireOrg();
  await supabase.from("service_plan_items").delete().eq("id", id);
  if (UUID.test(serviceId)) revalidatePath(`/services/${serviceId}`);
}

// Troca a posição do item com o vizinho (dir=-1 sobe, +1 desce) dentro do template.
export async function movePlanItemAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  const serviceId = String(fd.get("serviceId") ?? "");
  const dir = Number(fd.get("dir") ?? 0);
  if (!UUID.test(id) || !UUID.test(serviceId) || (dir !== -1 && dir !== 1)) return;
  const { supabase, orgId } = await requireOrg();
  const res = await supabase
    .from("service_plan_items")
    .select("id, position")
    .eq("org_id", orgId)
    .eq("service_id", serviceId)
    .is("session_id", null)
    .order("position", { ascending: true });
  const list = res.data ?? [];
  const idx = list.findIndex((x) => x.id === id);
  const swapIdx = idx + dir;
  if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
  const a = list[idx]!;
  const b = list[swapIdx]!;
  await supabase.from("service_plan_items").update({ position: b.position }).eq("id", a.id);
  await supabase.from("service_plan_items").update({ position: a.position }).eq("id", b.id);
  revalidatePath(`/services/${serviceId}`);
}

// --- Presença (caminho compartilhado, context_type='service') ---
export async function recordServiceAttendanceAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const serviceId = String(fd.get("serviceId") ?? "");
  const campus = String(fd.get("campus") ?? "");
  const stickIds = fd.getAll("stick").map(String).filter(Boolean);
  if (!UUID.test(serviceId)) return fail("Culto inválido.");
  if (stickIds.length === 0) return done();
  const { supabase, orgId } = await requireOrg();
  try {
    const campusId = await ensureCampusId(supabase, orgId, campus);
    const { error } = await recordAttendance(supabase, orgId, {
      contextType: "service",
      contextId: serviceId,
      campusId,
      stickIds,
      sessionDate: isoDate(today()),
    });
    if (error) return fail(toMessage(error, "Não consegui registrar a presença."));
    revalidatePath(`/services/${serviceId}`);
    revalidatePath("/services");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}
