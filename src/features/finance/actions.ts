"use server";

// Server Actions de Finance: criar lançamento (com categoria nova opcional) e
// excluir. Valida → sessão/org no servidor → Supabase (RLS) → revalidate.
import { revalidatePath } from "next/cache";
import { requireOrg, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { parseEntryInput } from "./schema";
import type { EntryType } from "./domain";

async function ensureCampusId(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const found = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  if (found.data) return found.data.id;
  const created = await supabase.from("campuses").insert({ org_id: orgId, name }).select("id").single();
  return created.data?.id ?? null;
}

// Garante a categoria em finance_categories (para popular o select nas próximas
// vezes). Idempotente por (org, nome, tipo). O nome também vai denormalizado no
// lançamento, então isto é só a manutenção da lista.
async function ensureCategory(supabase: DB, orgId: string, name: string, type: EntryType): Promise<void> {
  if (!name) return;
  const found = await supabase
    .from("finance_categories")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", name)
    .eq("type", type)
    .maybeSingle();
  if (!found.data) await supabase.from("finance_categories").insert({ org_id: orgId, name, type });
}

export async function createEntryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseEntryInput(formData);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const { supabase, orgId } = await requireOrg();
  try {
    const campusId = await ensureCampusId(supabase, orgId, parsed.data.campus);
    if (parsed.data.newCategory) await ensureCategory(supabase, orgId, parsed.data.cat, parsed.data.type);

    const { error } = await supabase.from("finance_entries").insert({
      org_id: orgId,
      type: parsed.data.type,
      description: parsed.data.desc,
      category_name: parsed.data.cat || null,
      category_id: null,
      fund_name: parsed.data.fund || null,
      fund_id: null,
      amount: parsed.data.amount,
      campus_id: campusId,
      ...(parsed.data.date ? { entry_date: parsed.data.date } : {}),
    });
    if (error) return fail(toMessage(error, "Não consegui salvar o lançamento."));

    revalidatePath("/finance");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireOrg();
  await supabase.from("finance_entries").delete().eq("id", id);
  revalidatePath("/finance");
}
