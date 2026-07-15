"use server";

// Server Actions de Study/Sermões (slice 1: CRUD + autosave do editor). Valida →
// sessão/org no servidor → Supabase (RLS) → revalidate. `content` (jsonb NOT NULL)
// é gravado 1:1, nunca null; `updated_at` setado na action (sem confiar em trigger).
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { coerceSermon, type SermonSaveInput } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v: string | null): string | null {
  return v && UUID.test(v) ? v : null;
}

async function campusIdForName(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const res = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  return res.data?.id ?? null;
}

// Cria (id null) ou atualiza (autosave) um sermão. Devolve o id — o editor adota o id
// do banco no primeiro save de um sermão novo.
export async function saveSermonAction(input: SermonSaveInput): Promise<ActionResult<{ id: string }>> {
  const c = coerceSermon(input);
  if (!c.ok) return fail(c.message);
  const { supabase, orgId } = await requireOrg();
  try {
    const campus_id = await campusIdForName(supabase, orgId, c.data.campus);
    const row = {
      title: c.data.title,
      subtitle: c.data.subtitle || null,
      campus_id,
      sermon_date: c.data.sermon_date || null,
      series_id: uuidOrNull(c.data.series_id),
      service_id: uuidOrNull(c.data.service_id),
      status: c.data.status,
      visibility: c.data.visibility,
      main_passage: c.data.main_passage || null,
      big_idea: c.data.big_idea || null,
      content: c.data.content as never,
      updated_at: new Date().toISOString(),
    };

    const id = uuidOrNull(input.id);
    if (id) {
      const { error } = await supabase.from("sermons").update(row).eq("id", id);
      if (error) return fail(toMessage(error, "Não consegui salvar o sermão."));
      revalidatePath("/study");
      revalidatePath(`/study/sermon/${id}`);
      return ok({ id });
    }

    const { data, error } = await supabase.from("sermons").insert({ ...row, org_id: orgId }).select("id").single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar o sermão."));
    revalidatePath("/study");
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// DESTRUTIVO: sermon_scriptures → CASCADE (as passagens somem); study_notes.sermon_id
// → SET NULL (a nota sobrevive, desassociada). Ver handoff.
export async function deleteSermonAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { supabase } = await requireOrg();
  await supabase.from("sermons").delete().eq("id", id);
  revalidatePath("/study");
}
