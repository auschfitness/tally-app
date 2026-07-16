"use server";

// Server Actions de Coordenação. Valida → sessão/org → Supabase → revalidate.
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { parsePostInput, parseTaskInput } from "./schema";
import { isoDate, today } from "@/lib/utils/date";

export async function createPostAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parsePostInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  const { error } = await supabase.from("coordination_posts").insert({
    org_id: orgId,
    title: parsed.data.title,
    body: parsed.data.body || null,
    team: parsed.data.team,
    posted_on: isoDate(today()),
  });
  if (error) return fail(toMessage(error, "Não consegui publicar o aviso."));
  revalidatePath("/coordination");
  return ok(undefined);
}

export async function createTaskAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseTaskInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  const { error } = await supabase.from("coordination_tasks").insert({
    org_id: orgId,
    text: parsed.data.text,
    assignee: parsed.data.who || null,
    done: false,
  });
  if (error) return fail(toMessage(error, "Não consegui criar a tarefa."));
  revalidatePath("/coordination");
  return ok(undefined);
}

export async function toggleTaskAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!id) return;
  const { supabase } = await requireOrg();
  await supabase.from("coordination_tasks").update({ done: !done }).eq("id", id);
  revalidatePath("/coordination");
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireOrg();
  await supabase.from("coordination_tasks").delete().eq("id", id);
  revalidatePath("/coordination");
}
