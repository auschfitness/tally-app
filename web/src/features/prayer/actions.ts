"use server";

// Server Actions de Oração: criar pedido, "orando +1", marcar respondida, recolocar
// no mural. Cada uma valida a entrada, obtém sessão/org no servidor, escreve no
// Supabase (RLS é a barreira) e revalida a rota.
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { parsePrayerInput } from "./schema";
import { isoDate, today } from "@/lib/utils/date";

async function groupIdByName(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase.from("groups").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  return data?.id ?? null;
}

export async function createPrayerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parsePrayerInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const { supabase, orgId } = await requireOrg();
  try {
    const groupId = await groupIdByName(supabase, orgId, parsed.data.group);
    const { error } = await supabase.from("prayer_requests").insert({
      org_id: orgId,
      title: parsed.data.title || null,
      author_name: parsed.data.author,
      request: parsed.data.request,
      topics: parsed.data.topics,
      privacy: parsed.data.privacy,
      group_id: groupId,
      praying_count: 0,
      answered: false,
    });
    if (error) return fail(toMessage(error, "Não consegui publicar o pedido."));
    revalidatePath("/prayer");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

// "Orando (+1)": incremento atômico via RPC seria ideal; sem uma, lemos e somamos
// (a contagem é um indicador de comunhão, não um número crítico).
export async function prayForAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireOrg();
  const { data } = await supabase.from("prayer_requests").select("praying_count").eq("id", id).maybeSingle();
  const next = (data?.praying_count ?? 0) + 1;
  await supabase.from("prayer_requests").update({ praying_count: next }).eq("id", id);
  revalidatePath("/prayer");
}

export async function markAnsweredAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireOrg();
  await supabase.from("prayer_requests").update({ answered: true, answered_on: isoDate(today()) }).eq("id", id);
  revalidatePath("/prayer");
}

export async function restorePrayerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireOrg();
  await supabase.from("prayer_requests").update({ answered: false, answered_on: null }).eq("id", id);
  revalidatePath("/prayer");
}
