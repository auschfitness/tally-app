"use server";

// Server Actions de Times/Ministérios/Escala. Cada uma: valida → sessão/org no
// servidor → Supabase (RLS) → revalidate. Nunca confia em org/campus/ids do
// navegador. Side-effects de memória da igreja em timeline_events (DNA #4).
// leadershipDev (apprentice/co-líder) persiste no sub-campo do blob app_state —
// não há coluna relacional (ver README + handoff).
import { revalidatePath } from "next/cache";
import { requireOrg, type DB, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, done, fail, toMessage } from "@/lib/errors";
import { isoDate, today } from "@/lib/utils/date";
import { readLeadershipDev } from "./queries";
import { parseAssignInput, parseMemberRoleInput, parseMinistryInput, parseTeamInput } from "./schema";
import type { DevStage } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v: string): string | null {
  return UUID.test(v) ? v : null;
}

async function campusIdForName(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const res = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  return res.data?.id ?? null;
}

// Registra um evento na Timeline (memória da igreja). Ignora stick inválida.
async function addTimeline(
  ctx: OrgContext,
  stickId: string,
  eventType: string,
  title: string,
  summary: string,
): Promise<void> {
  if (!UUID.test(stickId)) return;
  await ctx.supabase.from("timeline_events").insert({
    org_id: ctx.orgId,
    stick_id: stickId,
    event_type: eventType,
    source_module: "teams",
    title,
    summary,
    occurred_at: new Date().toISOString(),
  });
}

function revalidateTeams(): void {
  revalidatePath("/teams");
  revalidatePath("/teams/schedule");
}

// --- Ministérios ---
export async function createMinistryAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = parseMinistryInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const campus_id = await campusIdForName(ctx.supabase, ctx.orgId, parsed.data.campus);
    const { error } = await ctx.supabase.from("ministries").insert({
      org_id: ctx.orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      campus_id,
      leader_id: uuidOrNull(parsed.data.leaderStickId),
      status: parsed.data.status,
    });
    if (error) return fail(toMessage(error, "Não consegui criar o ministério."));
    revalidateTeams();
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateMinistryAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const parsed = parseMinistryInput(fd);
  if (!id) return fail("Ministério inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const campus_id = await campusIdForName(ctx.supabase, ctx.orgId, parsed.data.campus);
    const { error } = await ctx.supabase
      .from("ministries")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        campus_id,
        leader_id: uuidOrNull(parsed.data.leaderStickId),
        status: parsed.data.status,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar o ministério."));
    revalidateTeams();
    revalidatePath(`/teams/ministry/${id}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// DESTRUTIVO: FK teams.ministry_id ON DELETE CASCADE → apaga os times do ministério
// (e, em cascata, os membros). A UI confirma antes.
export async function deleteMinistryAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const ctx = await requireOrg();
  await ctx.supabase.from("ministries").delete().eq("id", id);
  revalidateTeams();
}

// --- Times ---
export async function createTeamAction(_prev: ActionResult<{ id: string }>, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = parseTeamInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const campus_id = await campusIdForName(ctx.supabase, ctx.orgId, parsed.data.campus);
    const { data, error } = await ctx.supabase
      .from("teams")
      .insert({
        org_id: ctx.orgId,
        ministry_id: uuidOrNull(parsed.data.ministryId),
        name: parsed.data.name,
        description: parsed.data.description || null,
        campus_id,
        leader_id: uuidOrNull(parsed.data.leaderStickId),
        serving_roles: parsed.data.servingRoles,
        status: parsed.data.status,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar o time."));
    revalidateTeams();
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateTeamAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const parsed = parseTeamInput(fd);
  if (!id) return fail("Time inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const campus_id = await campusIdForName(ctx.supabase, ctx.orgId, parsed.data.campus);
    const { error } = await ctx.supabase
      .from("teams")
      .update({
        ministry_id: uuidOrNull(parsed.data.ministryId),
        name: parsed.data.name,
        description: parsed.data.description || null,
        campus_id,
        leader_id: uuidOrNull(parsed.data.leaderStickId),
        serving_roles: parsed.data.servingRoles,
        status: parsed.data.status,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar o time."));
    revalidateTeams();
    revalidatePath(`/teams/${id}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// DESTRUTIVO: team_members.team_id ON DELETE CASCADE remove os vínculos automaticamente;
// schedule_assignments.team_id ON DELETE SET NULL deixa as escalas órfãs (não apaga).
export async function deleteTeamAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const ctx = await requireOrg();
  await ctx.supabase.from("teams").delete().eq("id", id);
  revalidateTeams();
}

// --- Membros de serviço (team_members) ---
// Liga uma Stick a um Time (upsert por team_id+stick_id — não duplica). Timeline "começou a servir".
export async function addTeamMemberAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const teamId = String(fd.get("teamId") ?? "");
  const stickId = String(fd.get("stickId") ?? "");
  const role = String(fd.get("role") ?? "").trim();
  if (!UUID.test(teamId) || !UUID.test(stickId)) return fail("Selecione a pessoa.");
  const ctx = await requireOrg();
  try {
    const { error } = await ctx.supabase.from("team_members").upsert(
      {
        org_id: ctx.orgId,
        team_id: teamId,
        stick_id: stickId,
        role: role || null,
        status: "active",
        joined_at: isoDate(today()),
      },
      { onConflict: "team_id,stick_id" },
    );
    if (error) return fail(toMessage(error, "Não consegui adicionar ao time."));
    const team = await ctx.supabase.from("teams").select("name").eq("id", teamId).maybeSingle();
    await addTimeline(ctx, stickId, "team_joined", "Começou a servir", team.data?.name ? "Entrou no time " + team.data.name : "Entrou em um time");
    revalidateTeams();
    revalidatePath(`/teams/${teamId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateTeamMemberAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = parseMemberRoleInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const { memberId, role, status, availability, devStage } = parsed.data;
    // Estágio de liderança só é editável quando o membro NÃO é o líder do time
    // (a UI oculta o campo nesse caso). `leader` nunca chega aqui (não é settable).
    const isLeader = String(fd.get("isLeader") ?? "") === "1";
    if (!isLeader) await setMemberDev(ctx, memberId, devStage);
    const { error } = await ctx.supabase
      .from("team_members")
      .update({ role: role || null, status, availability: availability || null })
      .eq("id", memberId);
    if (error) return fail(toMessage(error, "Não consegui salvar."));
    revalidateTeams();
    const teamId = String(fd.get("teamId") ?? "");
    if (UUID.test(teamId)) revalidatePath(`/teams/${teamId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function removeTeamMemberAction(fd: FormData): Promise<void> {
  const memberId = String(fd.get("memberId") ?? "");
  const teamId = String(fd.get("teamId") ?? "");
  if (!UUID.test(memberId)) return;
  const ctx = await requireOrg();
  await ctx.supabase.from("team_members").delete().eq("id", memberId);
  revalidateTeams();
  if (UUID.test(teamId)) revalidatePath(`/teams/${teamId}`);
}

// Define/limpa o líder do time (teams.leader_id). Timeline "passou a liderar".
export async function setTeamLeaderAction(fd: FormData): Promise<void> {
  const teamId = String(fd.get("teamId") ?? "");
  const stickId = String(fd.get("stickId") ?? "");
  if (!UUID.test(teamId)) return;
  const ctx = await requireOrg();
  const value = uuidOrNull(stickId);
  const { error } = await ctx.supabase.from("teams").update({ leader_id: value }).eq("id", teamId);
  if (!error && value) {
    const team = await ctx.supabase.from("teams").select("name").eq("id", teamId).maybeSingle();
    await addTimeline(ctx, value, "team_leader_set", "Passou a liderar", team.data?.name ? "Líder do time " + team.data.name : "Líder de um time");
  }
  revalidateTeams();
  revalidatePath(`/teams/${teamId}`);
}

// --- Escala (schedule_assignments) ---
export async function createAssignmentAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = parseAssignInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  try {
    const { teamId, stickId, role, date, status } = parsed.data;
    if (!UUID.test(teamId) || !UUID.test(stickId)) return fail("Selecione time e pessoa.");
    const { error } = await ctx.supabase.from("schedule_assignments").insert({
      org_id: ctx.orgId,
      team_id: teamId,
      stick_id: stickId,
      role: role || null,
      assignment_date: date,
      status,
    });
    if (error) return fail(toMessage(error, "Não consegui escalar."));
    revalidateTeams();
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Avança o status no ciclo. Confirmar carimba confirmed_at; sair de confirmado limpa.
export async function setAssignmentStatusAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  const allowed = ["assigned", "confirmed", "declined", "replacement_needed", "completed"];
  if (!UUID.test(id) || !allowed.includes(status)) return;
  const ctx = await requireOrg();
  await ctx.supabase
    .from("schedule_assignments")
    .update({ status, confirmed_at: status === "confirmed" ? new Date().toISOString() : null })
    .eq("id", id);
  revalidateTeams();
}

export async function deleteAssignmentAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const ctx = await requireOrg();
  await ctx.supabase.from("schedule_assignments").delete().eq("id", id);
  revalidateTeams();
}

// Patch cirúrgico do sub-campo leadershipDev no blob app_state, preservando todos os
// outros sub-campos (milestones, household, config, signalOverrides...) que outras
// features ainda não migradas dependem. "serving" (default) apaga a chave.
async function setMemberDev(ctx: OrgContext, memberId: string, stage: DevStage): Promise<void> {
  const cur = await ctx.supabase.from("app_state").select("data").eq("org_id", ctx.orgId).maybeSingle();
  const data: Record<string, unknown> = (cur.data?.data && typeof cur.data.data === "object" ? { ...(cur.data.data as Record<string, unknown>) } : {});
  const ld: Record<string, string> = { ...readLeadershipDev(data) };
  if (stage === "serving") delete ld[memberId];
  else ld[memberId] = stage;
  data.leadershipDev = ld;
  await ctx.supabase.from("app_state").upsert({
    org_id: ctx.orgId,
    data: data as never,
    updated_at: new Date().toISOString(),
    updated_by: ctx.user.id,
  });
}
