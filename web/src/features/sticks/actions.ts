"use server";

// Server Actions de Sticks. Cada uma: 1) valida a entrada; 2) obtém e valida a
// sessão/org no servidor; 3) executa no Supabase (RLS é a barreira real);
// 4) trata erro; 5) revalida a rota. Nada de user/org/campus vindo do navegador.
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { parsePersonInput } from "./schema";
import { positionForJourneyCode } from "./domain";
import type { PersonInput } from "./types";

// Garante uma linha em `campuses` para o nome (campus pode existir só no legado).
async function ensureCampusId(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const found = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  if (found.data) return found.data.id;
  const created = await supabase.from("campuses").insert({ org_id: orgId, name }).select("id").single();
  return created.data?.id ?? null;
}

// Id do estágio de jornada para um código (via position na journey default da org).
async function stageIdForCode(supabase: DB, code: string): Promise<string | null> {
  const position = positionForJourneyCode(code);
  const { data } = await supabase.from("journey_stages").select("id").eq("position", position).limit(1).maybeSingle();
  return data?.id ?? null;
}

// Reconciliação simples de grupo (uma associação ativa por Stick). Os eventos de
// timeline de entrada/saída entram quando a feature Groups migrar (matrix §D2).
async function setGroupMembership(supabase: DB, orgId: string, stickId: string, groupName: string): Promise<void> {
  const active = await supabase
    .from("group_members")
    .select("id, group_id")
    .eq("stick_id", stickId)
    .eq("status", "active");
  const current = active.data ?? [];

  let targetGroupId: string | null = null;
  if (groupName) {
    const g = await supabase.from("groups").select("id").eq("org_id", orgId).eq("name", groupName).maybeSingle();
    targetGroupId = g.data?.id ?? null;
  }

  // Já está no grupo certo → nada a fazer.
  if (targetGroupId && current.some((m) => m.group_id === targetGroupId)) {
    for (const m of current) {
      if (m.group_id !== targetGroupId) await supabase.from("group_members").update({ status: "inactive", left_at: new Date().toISOString() }).eq("id", m.id);
    }
    return;
  }

  // Desativa as associações ativas atuais.
  for (const m of current) {
    await supabase.from("group_members").update({ status: "inactive", left_at: new Date().toISOString() }).eq("id", m.id);
  }
  // Entra no novo grupo.
  if (targetGroupId) {
    await supabase.from("group_members").upsert(
      { group_id: targetGroupId, stick_id: stickId, role: "member", status: "active" },
      { onConflict: "group_id,stick_id", ignoreDuplicates: false },
    );
  }
}

function rowFromInput(input: PersonInput, campusId: string | null) {
  return {
    full_name: input.name,
    relationship_status: input.relationship,
    is_leader: input.isLeader,
    primary_campus_id: campusId,
    last_seen_at: input.lastSeen || null,
    followup_open: input.followup,
  };
}

export async function createStickAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parsePersonInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const { supabase, orgId } = await requireOrg();
  try {
    const campusId = await ensureCampusId(supabase, orgId, parsed.data.campus);
    const journeyCode = parsed.data.relationship === "member" ? "connected" : "first_visit";
    const stageId = await stageIdForCode(supabase, journeyCode);

    const { data, error } = await supabase
      .from("sticks")
      .insert({
        org_id: orgId,
        ...rowFromInput(parsed.data, campusId),
        first_visit_date: new Date().toISOString().slice(0, 10),
        source: "Adicionado manualmente",
        journey_stage_id: stageId,
      })
      .select("id")
      .single();

    if (error || !data) return fail(toMessage(error, "Não consegui salvar a pessoa."));

    if (parsed.data.group) await setGroupMembership(supabase, orgId, data.id, parsed.data.group);

    revalidatePath("/sticks");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateStickAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Pessoa inválida.");

  const parsed = parsePersonInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const { supabase, orgId } = await requireOrg();
  try {
    const campusId = await ensureCampusId(supabase, orgId, parsed.data.campus);
    const { error } = await supabase.from("sticks").update(rowFromInput(parsed.data, campusId)).eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar as alterações."));

    await setGroupMembership(supabase, orgId, id, parsed.data.group);

    revalidatePath("/sticks");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function archiveStickAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireOrg();
  await supabase.from("sticks").update({ archived: true }).eq("id", id);
  revalidatePath("/sticks");
}
