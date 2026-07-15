"use server";

// Server Actions de Eventos: CRUD do evento e inscrição/check-in INTERNOS. Valida →
// sessão/org no servidor → Supabase (RLS) → revalidate. Inscrição pública/pagamento
// online seguem ADIADOS (não habilitar; ver docs/handoffs/events-supabase.md).
//
// Check-in de evento = `event_registrations.checked_in` (fluxo próprio do legado),
// NÃO `lib/attendance`. São coisas distintas — ver README.
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, done, fail, toMessage } from "@/lib/errors";
import { tsFrom } from "./domain";
import { parseEventInput, parseRegistrationInput } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v: string): string | null {
  return UUID.test(v) ? v : null;
}

async function campusIdForName(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const res = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  return res.data?.id ?? null;
}

// --- Eventos ---
export async function createEventAction(_prev: ActionResult<{ id: string }>, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = parseEventInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    const d = parsed.data;
    const campus_id = await campusIdForName(supabase, orgId, d.campus);
    const { data, error } = await supabase
      .from("events")
      .insert({
        org_id: orgId,
        name: d.name,
        type: d.type || null,
        description: d.description || null,
        campus_id,
        event_date: d.event_date || null,
        starts_at: tsFrom(d.event_date, d.start_time),
        end_time: tsFrom(d.event_date, d.end_time),
        location: d.location || null,
        capacity: d.capacity,
        registration_required: d.registration_required,
        payment_required: d.payment_required,
        check_in_enabled: d.check_in_enabled,
        status: d.status,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar o evento."));
    revalidatePath("/events");
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateEventAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const parsed = parseEventInput(fd);
  if (!id) return fail("Evento inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    const d = parsed.data;
    const campus_id = await campusIdForName(supabase, orgId, d.campus);
    const { error } = await supabase
      .from("events")
      .update({
        name: d.name,
        type: d.type || null,
        description: d.description || null,
        campus_id,
        event_date: d.event_date || null,
        starts_at: tsFrom(d.event_date, d.start_time),
        end_time: tsFrom(d.event_date, d.end_time),
        location: d.location || null,
        capacity: d.capacity,
        registration_required: d.registration_required,
        payment_required: d.payment_required,
        check_in_enabled: d.check_in_enabled,
        status: d.status,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar o evento."));
    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// DESTRUTIVO: event_registrations.event_id ON DELETE CASCADE → apagar o evento apaga
// as inscrições dele automaticamente (o passo manual do legado é redundante).
export async function deleteEventAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { supabase } = await requireOrg();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/events");
}

// --- Inscrições ---
// Vincula a uma Stick existente OU registra visitante novo (stick_id null; NÃO cria
// Stick). SEM UNIQUE no banco → dedupe no app: uma Stick não se inscreve 2× no mesmo
// evento (visitante anônimo pode repetir, pois não tem chave). Ver handoff ⚠️ alerta 1.
export async function addRegistrationAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const eventId = String(fd.get("eventId") ?? "");
  const parsed = parseRegistrationInput(fd);
  if (!UUID.test(eventId)) return fail("Evento inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    const stickId = uuidOrNull(parsed.data.stickId);
    if (stickId) {
      const dup = await supabase
        .from("event_registrations")
        .select("id")
        .eq("org_id", orgId)
        .eq("event_id", eventId)
        .eq("stick_id", stickId)
        .limit(1)
        .maybeSingle();
      if (dup.data) return fail("Essa pessoa já está inscrita neste evento.");
    }
    const { error } = await supabase.from("event_registrations").insert({
      org_id: orgId,
      event_id: eventId,
      stick_id: stickId,
      name: parsed.data.name || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      answers: {},
      checked_in: parsed.data.checkedIn,
      checked_in_at: parsed.data.checkedIn ? new Date().toISOString() : null,
    });
    if (error) return fail(toMessage(error, "Não consegui inscrever."));
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Alterna o check-in de uma inscrição (carimba/limpa checked_in_at).
export async function toggleCheckInAction(fd: FormData): Promise<void> {
  const regId = String(fd.get("regId") ?? "");
  const eventId = String(fd.get("eventId") ?? "");
  const on = String(fd.get("on") ?? "") === "1";
  if (!UUID.test(regId)) return;
  const { supabase } = await requireOrg();
  await supabase
    .from("event_registrations")
    .update({ checked_in: on, checked_in_at: on ? new Date().toISOString() : null })
    .eq("id", regId);
  if (UUID.test(eventId)) revalidatePath(`/events/${eventId}`);
}

export async function removeRegistrationAction(fd: FormData): Promise<void> {
  const regId = String(fd.get("regId") ?? "");
  const eventId = String(fd.get("eventId") ?? "");
  if (!UUID.test(regId)) return;
  const { supabase } = await requireOrg();
  await supabase.from("event_registrations").delete().eq("id", regId);
  if (UUID.test(eventId)) revalidatePath(`/events/${eventId}`);
}
