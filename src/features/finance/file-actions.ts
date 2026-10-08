"use server";

// Comprovantes (spec 12, fase C). O navegador sobe o arquivo direto para o Storage por uma URL
// assinada que só o servidor emite (depois de conferir tipo, tamanho, limite e dono); em
// seguida registra a ligação. RLS do bucket e da tabela (m65) é a barreira real.
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOrg, can, type DB } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { fileExt, fileProblem, FILES_BUCKET, MAX_FILES_PER_ITEM, type FileTarget } from "./files";

const DENIED = "Você não tem permissão para mexer nas finanças.";

interface FileMeta {
  name: string;
  mime: string;
  size: number;
}

// Confere que o alvo é da org e devolve as colunas a gravar (conta já paga liga também ao lançamento).
async function resolveTarget(supabase: DB, orgId: string, target: FileTarget): Promise<{ bill_id: string | null; journal_entry_id: string | null } | null> {
  if ("billId" in target) {
    const { data } = await supabase.from("finance_bills").select("id, journal_entry_id").eq("org_id", orgId).eq("id", target.billId).maybeSingle();
    return data ? { bill_id: data.id, journal_entry_id: data.journal_entry_id } : null;
  }
  const { data } = await supabase.from("journal_entries").select("id").eq("org_id", orgId).eq("id", target.entryId).maybeSingle();
  return data ? { bill_id: null, journal_entry_id: data.id } : null;
}

async function countFiles(supabase: DB, orgId: string, target: FileTarget): Promise<number> {
  const q = supabase.from("finance_files").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  const { count } = await ("billId" in target ? q.eq("bill_id", target.billId) : q.eq("journal_entry_id", target.entryId));
  return count ?? 0;
}

export async function prepareUploadAction(target: FileTarget, meta: FileMeta): Promise<ActionResult<{ path: string; token: string }>> {
  const problem = fileProblem(meta.mime, meta.size);
  if (problem) return fail(problem);
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  if (!(await resolveTarget(supabase, orgId, target))) return fail("Não encontrei onde anexar.");
  if ((await countFiles(supabase, orgId, target)) >= MAX_FILES_PER_ITEM) return fail(`Até ${MAX_FILES_PER_ITEM} comprovantes por item.`);
  const path = `${orgId}/${randomUUID()}.${fileExt(meta.mime)}`;
  const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail(toMessage(error, "Não consegui preparar o envio."));
  return ok({ path, token: data.token });
}

export async function attachFileAction(target: FileTarget, path: string, meta: FileMeta): Promise<ActionResult> {
  const problem = fileProblem(meta.mime, meta.size);
  if (problem) return fail(problem);
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  if (!path.startsWith(`${orgId}/`)) return fail("Caminho inválido.");
  const link = await resolveTarget(supabase, orgId, target);
  if (!link) return fail("Não encontrei onde anexar.");
  const name = meta.name.trim().slice(0, 200) || "comprovante";
  const { error } = await supabase.from("finance_files").insert({ org_id: orgId, ...link, path, name, mime: meta.mime, size: meta.size });
  if (error) {
    await supabase.storage.from(FILES_BUCKET).remove([path]);
    return fail(toMessage(error, "Não consegui guardar o comprovante."));
  }
  revalidatePath("/finance");
  return ok(undefined);
}

export async function deleteFileAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx, "finance.manage")) return fail(DENIED);
  const { supabase, orgId } = ctx;
  const { data: row } = await supabase.from("finance_files").select("id, path").eq("org_id", orgId).eq("id", id).maybeSingle();
  if (!row) return fail("Comprovante não encontrado.");
  const del = await supabase.from("finance_files").delete().eq("id", row.id);
  if (del.error) return fail(toMessage(del.error, "Não consegui excluir."));
  await supabase.storage.from(FILES_BUCKET).remove([row.path]);
  revalidatePath("/finance");
  return ok(undefined);
}

