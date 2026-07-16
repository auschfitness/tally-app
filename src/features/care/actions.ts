"use server";

// Server Actions de Care. RLS por PERMISSÃO (diferente do resto do app):
//  - criar/editar item, notas e contatos → exigem `care.view`;
//  - apagar item → exige `care.manage`.
// A RLS do banco é a barreira real; `can(ctx, ...)` aqui só devolve um erro amigável
// ANTES de bater na RLS (evita mensagem crua). Owner tem tudo (fixture de teste).
//
// IDs de staff (assigned_to/author_id/contacted_by) são de auth.users — usamos
// SEMPRE `ctx.user.id` como autor real; o "responsável" vem do select de membros.
// Ver docs/handoffs/care-supabase.md.
import { revalidatePath } from "next/cache";
import { requireOrg, can, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, done, fail, toMessage } from "@/lib/errors";
import { parseCareItemInput, parseContactInput, parseNoteInput } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v: string | null): string | null {
  return v && UUID.test(v) ? v : null;
}
// Rótulos de app (NÃO segurança — ver handoff). Defaults não-nulos exigidos pelo banco.
const DEFAULT_CONFIDENTIALITY = "standard";
const DEFAULT_NOTE_VISIBILITY = "team";

function ensureCanView(ctx: OrgContext): boolean {
  return can(ctx, "care.view");
}

// Cria um Care Item. created_by = usuário real. Pode nascer de um Signal (signalId).
export async function createCareItemAction(_prev: ActionResult<{ id: string }>, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = parseCareItemInput(fd);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  if (!ensureCanView(ctx)) return fail("Você não tem permissão para gerenciar Care.");
  try {
    const d = parsed.data;
    const { data, error } = await ctx.supabase
      .from("care_items")
      .insert({
        org_id: ctx.orgId,
        stick_id: uuidOrNull(d.stickId),
        signal_id: uuidOrNull(d.signalId),
        category: d.category || null,
        title: d.title,
        description: d.description || null,
        assigned_to: uuidOrNull(d.assignedTo),
        priority: d.priority,
        status: d.status,
        due_date: d.dueDate || null,
        confidentiality_level: DEFAULT_CONFIDENTIALITY,
        next_action: d.nextAction || null,
        created_by: ctx.user.id,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar o Care."));
    revalidatePath("/care");
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Edita um Care Item (responsável, prioridade, status, próxima ação, prazo...).
// Ao resolver/fechar, carimba resolved_at; ao reabrir, limpa.
export async function updateCareItemAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = String(fd.get("id") ?? "");
  const parsed = parseCareItemInput(fd);
  if (!UUID.test(id)) return fail("Care inválido.");
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);
  const ctx = await requireOrg();
  if (!ensureCanView(ctx)) return fail("Você não tem permissão para gerenciar Care.");
  try {
    const d = parsed.data;
    const closing = d.status === "resolved" || d.status === "closed";
    const { error } = await ctx.supabase
      .from("care_items")
      .update({
        stick_id: uuidOrNull(d.stickId),
        category: d.category || null,
        title: d.title,
        description: d.description || null,
        assigned_to: uuidOrNull(d.assignedTo),
        priority: d.priority,
        status: d.status,
        due_date: d.dueDate || null,
        next_action: d.nextAction || null,
        resolved_at: closing ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return fail(toMessage(error, "Não consegui salvar o Care."));
    revalidatePath("/care");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// DESTRUTIVO: apagar item → CASCADE em care_notes e care_contacts. Exige care.manage.
export async function deleteCareItemAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const ctx = await requireOrg();
  if (!can(ctx, "care.manage")) return; // RLS também barra; evita ação silenciosa sem perm
  await ctx.supabase.from("care_items").delete().eq("id", id);
  revalidatePath("/care");
}

// Nota interna (care_notes). author_id = usuário real; visibility é rótulo.
export async function addCareNoteAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const itemId = String(fd.get("careItemId") ?? "");
  const parsed = parseNoteInput(fd);
  if (!UUID.test(itemId)) return fail("Care inválido.");
  if (!parsed.ok) return fail(parsed.message);
  const ctx = await requireOrg();
  if (!ensureCanView(ctx)) return fail("Você não tem permissão para gerenciar Care.");
  try {
    const { error } = await ctx.supabase.from("care_notes").insert({
      care_item_id: itemId,
      author_id: ctx.user.id,
      visibility: DEFAULT_NOTE_VISIBILITY,
      content: parsed.data.content,
    });
    if (error) return fail(toMessage(error, "Não consegui salvar a nota."));
    revalidatePath("/care");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Registra um contato (care_contacts) e move o item: resolvido (checkbox) ou em
// andamento. contacted_by = usuário real. Espelha o contactModal do legado.
export async function addCareContactAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const itemId = String(fd.get("careItemId") ?? "");
  const parsed = parseContactInput(fd);
  if (!UUID.test(itemId)) return fail("Care inválido.");
  if (!parsed.ok) return fail(parsed.message);
  const ctx = await requireOrg();
  if (!ensureCanView(ctx)) return fail("Você não tem permissão para gerenciar Care.");
  try {
    const d = parsed.data;
    const cRes = await ctx.supabase.from("care_contacts").insert({
      care_item_id: itemId,
      contacted_by: ctx.user.id,
      contacted_on: d.contactedOn,
      method: d.method || null,
      note: d.note || null,
    });
    if (cRes.error) return fail(toMessage(cRes.error, "Não consegui registrar o contato."));
    await ctx.supabase
      .from("care_items")
      .update({
        status: d.resolve ? "resolved" : "in_progress",
        resolved_at: d.resolve ? new Date().toISOString() : null,
      })
      .eq("id", itemId);
    revalidatePath("/care");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}
