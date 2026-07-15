"use server";

// Server Actions de Study/Sermões (slice 1: CRUD + autosave do editor). Valida →
// sessão/org no servidor → Supabase (RLS) → revalidate. `content` (jsonb NOT NULL)
// é gravado 1:1, nunca null; `updated_at` setado na action (sem confiar em trigger).
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { coerceSermon, parseSeriesInput, type SermonSaveInput } from "./schema";

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

// Sincroniza as passagens de UM sermão (slice 2): upsert das atuais + remove as que
// saíram. UNIQUE (sermon_id, reference) → upsert onConflict não duplica ao re-parsear.
// `refs` vem do parser (lib/bible/parse). Nunca lança para a UI.
export interface SyncRef {
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  reference: string;
}
export async function syncSermonScripturesAction(sermonId: string, refs: SyncRef[]): Promise<void> {
  if (!UUID.test(sermonId)) return;
  const { supabase, orgId } = await requireOrg();

  // dedup por reference (a unique é (sermon_id, reference))
  const seen = new Set<string>();
  const desired = (refs ?? []).filter((r) => {
    if (!r || !r.reference || seen.has(r.reference)) return false;
    seen.add(r.reference);
    return true;
  });

  if (desired.length) {
    await supabase.from("sermon_scriptures").upsert(
      desired.map((r) => ({
        org_id: orgId,
        sermon_id: sermonId,
        book: r.book,
        chapter: r.chapter,
        verse_start: r.verse_start ?? null,
        verse_end: r.verse_end ?? null,
        reference: r.reference,
      })),
      { onConflict: "sermon_id,reference" },
    );
  }

  // remove as que não existem mais (compara o que há no banco para este sermão)
  const existing = await supabase.from("sermon_scriptures").select("id, reference").eq("org_id", orgId).eq("sermon_id", sermonId);
  const keep = new Set(desired.map((r) => r.reference));
  const toDelete = (existing.data ?? []).filter((x) => !keep.has(x.reference)).map((x) => x.id);
  if (toDelete.length) await supabase.from("sermon_scriptures").delete().in("id", toDelete);

  revalidatePath("/study/map");
}

// --- Séries (slice 3) ---
export async function createSeriesAction(_prev: ActionResult<{ id: string }>, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = parseSeriesInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase, orgId } = await requireOrg();
  try {
    const d = parsed.data;
    const { data, error } = await supabase
      .from("series")
      .insert({
        org_id: orgId,
        title: d.title,
        description: d.description || null,
        theme: d.theme || null,
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        status: d.status,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar a série."));
    revalidatePath("/study");
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function updateSeriesAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const parsed = parseSeriesInput(fd);
  if (!UUID.test(id)) return fail("Série inválida.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const { supabase } = await requireOrg();
  try {
    const d = parsed.data;
    const { error } = await supabase
      .from("series")
      .update({
        title: d.title,
        description: d.description || null,
        theme: d.theme || null,
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        status: d.status,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar a série."));
    revalidatePath("/study");
    revalidatePath(`/study/series/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Vincula (ou desvincula, seriesId="") um sermão a uma série. Atualiza sermons.series_id.
export async function setSermonSeriesAction(fd: FormData): Promise<void> {
  const sermonId = String(fd.get("sermonId") ?? "");
  const seriesId = String(fd.get("seriesId") ?? "");
  if (!UUID.test(sermonId)) return;
  const { supabase } = await requireOrg();
  await supabase.from("sermons").update({ series_id: uuidOrNull(seriesId), updated_at: new Date().toISOString() }).eq("id", sermonId);
  revalidatePath("/study");
  const backTo = String(fd.get("backTo") ?? "");
  if (backTo) revalidatePath(backTo);
}
