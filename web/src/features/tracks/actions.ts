"use server";

// Server Actions de Trilhas. Cada uma: valida → sessão/org no servidor → Supabase
// (RLS) → revalidate. Nunca confia em org/ids do navegador.
//
// Conclusão de trilha grava a MEMÓRIA da igreja (DNA #4): milestone operacional
// (`milestones`, code "completed_track") + `timeline_events`. `milestones` é
// COMPARTILHADA com Journey/Sticks — reusamos o mesmo caminho de inserção (mesmas
// colunas/convenção do legado tracks-repo), sem via paralela. A Journey NÃO é movida
// automaticamente (não há config trilha→journey; não forçar). Ver handoff.
import { revalidatePath } from "next/cache";
import { requireOrg, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { isoDate, today } from "@/lib/utils/date";
import { firstStepId, planAdvance, sortSteps } from "./domain";
import { parseTrackInput } from "./schema";
import type { TrackStep } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateTracks(trackId?: string): void {
  revalidatePath("/tracks");
  if (trackId && UUID.test(trackId)) revalidatePath(`/tracks/${trackId}`);
}

// Etapas (id/position/current) de uma trilha — usadas por enroll/advance para
// decidir no servidor (não confiar no que o cliente mandaria).
async function loadTrackSteps(ctx: OrgContext, trackId: string): Promise<TrackStep[]> {
  const res = await ctx.supabase
    .from("track_steps")
    .select("id, track_id, name, description, position")
    .eq("org_id", ctx.orgId)
    .eq("track_id", trackId)
    .order("position", { ascending: true });
  return (res.data ?? []).map((s) => ({
    id: s.id,
    track_id: s.track_id,
    name: s.name ?? "",
    description: s.description ?? "",
    position: s.position ?? 0,
  }));
}

// Cria uma trilha (status "active"). Devolve o id — o modal navega para o detalhe.
export async function createTrackAction(_prev: ActionResult<{ id: string }>, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = parseTrackInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const { data, error } = await ctx.supabase
      .from("tracks")
      .insert({
        org_id: ctx.orgId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        type: parsed.data.type || null,
        status: "active",
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar a trilha."));
    revalidateTracks();
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Adiciona uma etapa ao fim da trilha (position = próxima, calculada no servidor).
// `materials` nasce [] (jsonb NOT NULL — nunca null).
export async function addStepAction(fd: FormData): Promise<void> {
  const trackId = String(fd.get("trackId") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!UUID.test(trackId) || !name) return;
  const ctx = await requireOrg();
  const steps = await loadTrackSteps(ctx, trackId);
  await ctx.supabase.from("track_steps").insert({
    org_id: ctx.orgId,
    track_id: trackId,
    name,
    position: steps.length + 1,
    materials: [],
  });
  revalidateTracks(trackId);
}

// Matricula uma Stick (começa na 1ª etapa). Idempotente: UNIQUE (track_id, stick_id)
// → upsert onConflict não duplica a mesma pessoa na trilha.
export async function enrollAction(fd: FormData): Promise<void> {
  const trackId = String(fd.get("trackId") ?? "");
  const stickId = String(fd.get("stickId") ?? "");
  if (!UUID.test(trackId) || !UUID.test(stickId)) return;
  const ctx = await requireOrg();
  const steps = await loadTrackSteps(ctx, trackId);
  const first = firstStepId(steps);
  await ctx.supabase.from("track_enrollments").upsert(
    {
      org_id: ctx.orgId,
      track_id: trackId,
      stick_id: stickId,
      current_step_id: first,
      progress: 0,
      status: "in_progress",
      started_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "track_id,stick_id" },
  );
  revalidateTracks(trackId);
}

// Avança a matrícula para a próxima etapa; se era a última, conclui (milestone +
// timeline). Decisão pura em planAdvance; aqui só o efeito.
export async function advanceStepAction(fd: FormData): Promise<void> {
  const enrollmentId = String(fd.get("enrollmentId") ?? "");
  if (!UUID.test(enrollmentId)) return;
  const ctx = await requireOrg();

  const enrRes = await ctx.supabase
    .from("track_enrollments")
    .select("id, track_id, stick_id, current_step_id, status")
    .eq("org_id", ctx.orgId)
    .eq("id", enrollmentId)
    .maybeSingle();
  const en = enrRes.data;
  if (!en) return;

  const steps = sortSteps(await loadTrackSteps(ctx, en.track_id));
  const plan = planAdvance({ status: en.status, current_step_id: en.current_step_id }, steps);
  if (plan.kind === "noop") return;

  if (plan.kind === "advance") {
    await ctx.supabase
      .from("track_enrollments")
      .update({ current_step_id: plan.stepId, progress: plan.progress, updated_at: new Date().toISOString() })
      .eq("id", en.id);
    revalidateTracks(en.track_id);
    return;
  }

  // Conclusão: status completed + progress 100 + memória da igreja.
  await ctx.supabase
    .from("track_enrollments")
    .update({ status: "completed", progress: 100, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", en.id);
  await recordTrackCompletion(ctx, en.track_id, en.stick_id, en.id);
  revalidateTracks(en.track_id);
}

// Milestone operacional + timeline_event ao concluir. Mesma convenção do legado
// (code "completed_track", source_module "tracks", source_record_id = matrícula).
// `visibility` de ambos tem default no banco — não setamos aqui.
async function recordTrackCompletion(ctx: OrgContext, trackId: string, stickId: string, enrollmentId: string): Promise<void> {
  if (!UUID.test(stickId)) return;
  const trackRes = await ctx.supabase.from("tracks").select("name").eq("id", trackId).maybeSingle();
  const trackName = trackRes.data?.name ?? "trilha";
  await ctx.supabase.from("milestones").insert({
    org_id: ctx.orgId,
    stick_id: stickId,
    occurred_on: isoDate(today()),
    code: "completed_track",
    title: "Concluiu a trilha " + trackName,
    source_module: "tracks",
    source_record_id: enrollmentId,
  });
  await ctx.supabase.from("timeline_events").insert({
    org_id: ctx.orgId,
    stick_id: stickId,
    event_type: "track_completed",
    source_module: "tracks",
    source_record_id: enrollmentId,
    title: "Concluiu uma trilha",
    summary: "Concluiu " + trackName,
    occurred_at: new Date().toISOString(),
  });
}
