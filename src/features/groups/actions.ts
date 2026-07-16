"use server";

// Server Actions de Grupos: criar grupo, definir líder, registrar presença.
// Valida → sessão/org no servidor → Supabase (RLS) → revalidate.
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { ensureCampusId, recordAttendance } from "@/lib/attendance";
import { parseGroupInput } from "./schema";
import { isoDate, today } from "@/lib/utils/date";

// Promove uma Stick a líder do grupo (demove o líder anterior a membro).
async function promoteLeader(supabase: DB, groupId: string, stickId: string): Promise<void> {
  const current = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("role", "leader")
    .eq("status", "active");
  for (const m of current.data ?? []) {
    await supabase.from("group_members").update({ role: "member" }).eq("id", m.id);
  }
  if (stickId) {
    await supabase.from("group_members").upsert(
      { group_id: groupId, stick_id: stickId, role: "leader", status: "active" },
      { onConflict: "group_id,stick_id", ignoreDuplicates: false },
    );
  }
}

export async function createGroupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseGroupInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const { supabase, orgId } = await requireOrg();
  try {
    const campusId = await ensureCampusId(supabase, orgId, parsed.data.campus);
    const { data, error } = await supabase
      .from("groups")
      .insert({
        org_id: orgId,
        name: parsed.data.name,
        campus_id: campusId,
        meeting_day: parsed.data.day || null,
        meeting_time: parsed.data.time || null,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar o grupo."));

    if (parsed.data.leaderStickId) await promoteLeader(supabase, data.id, parsed.data.leaderStickId);

    revalidatePath("/groups");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function setGroupLeaderAction(formData: FormData): Promise<void> {
  const groupId = String(formData.get("groupId") ?? "");
  const leaderStickId = String(formData.get("leaderStickId") ?? "");
  if (!groupId) return;
  const { supabase } = await requireOrg();
  await promoteLeader(supabase, groupId, leaderStickId);
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function recordGroupAttendanceAction(formData: FormData): Promise<ActionResult> {
  const groupId = String(formData.get("groupId") ?? "");
  const campus = String(formData.get("campus") ?? "");
  const stickIds = formData.getAll("stick").map(String).filter(Boolean);
  if (!groupId) return fail("Grupo inválido.");
  if (stickIds.length === 0) return ok(undefined);

  const { supabase, orgId } = await requireOrg();
  try {
    const campusId = await ensureCampusId(supabase, orgId, campus);
    const { error } = await recordAttendance(supabase, orgId, {
      contextType: "group",
      contextId: groupId,
      campusId,
      stickIds,
      sessionDate: isoDate(today()),
    });
    if (error) return fail(toMessage(error, "Não consegui registrar a presença."));

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}
