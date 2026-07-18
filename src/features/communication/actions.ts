"use server";

// Server Actions da Comunicação (Fase 1). TODA ação valida `communication.send` no
// servidor (o RLS é a barreira real). Duas ações-chave:
//  · resolveRecipients — resolve o público, filtra por consentimento e devolve quem
//    recebe × quem é pulado (a pré-visualização; ninguém sai sem aparecer aqui).
//  · queueMessage — registra o envio: cria messages(queued) + uma linha por
//    destinatário em message_recipients (pending/skipped, com snapshot). NÃO envia
//    e-mail de verdade — só prepara.
//  · sendMessage — DISPARA a entrega: invoca a edge function `send-message` (que
//    manda via Resend e atualiza os status). "Preparar envio" ≠ "Enviar agora".
import { revalidatePath } from "next/cache";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { requireOrg, can } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import type { Json } from "@/lib/database.types";
import { parseComposeInput, type RawComposeInput } from "./schema";
import { audienceLabel, partitionByConsent, storableAudienceRef, summarizeSend } from "./domain";
import { resolveCandidates } from "./queries";
import type { ProcessedEntry, Recipient, SendOutcome, Skipped } from "./types";

const DENIED = "Você não tem permissão para enviar comunicações.";

// Provedor de e-mail (Resend) ainda sem secrets no Supabase → 503. Aviso claro em vez
// de erro cru, como pede o handoff.
const PROVIDER_NOT_CONFIGURED =
  "A entrega de e-mail ainda não foi configurada — fale com o administrador.";
const SEND_FAILED = "Não consegui enviar agora. Tente de novo.";

export interface ResolvePreview {
  recipients: Recipient[];
  skipped: Skipped[];
  audienceLabel: string;
}

// Pré-visualização dos destinatários. Resolve o público e parte por consentimento.
export async function resolveRecipients(raw: RawComposeInput): Promise<ActionResult<ResolvePreview>> {
  const parsed = parseComposeInput(raw);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const ctx = await requireOrg();
  if (!can(ctx, "communication.send")) return fail(DENIED);

  try {
    const { audienceKind, audienceRef } = parsed.data;
    const candidates = await resolveCandidates(ctx.supabase, ctx.orgId, audienceKind, audienceRef);
    const { recipients, skipped } = partitionByConsent(candidates);
    return ok({ recipients, skipped, audienceLabel: audienceLabel(audienceKind) });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Registra o envio. Re-resolve o público no servidor (não confia no client), grava a
// mensagem e uma linha por destinatário. Se algo falhar depois de criar a mensagem,
// remove-a para não deixar registro órfão.
export async function queueMessage(
  raw: RawComposeInput,
): Promise<ActionResult<{ messageId: string; queued: number; skipped: number }>> {
  const parsed = parseComposeInput(raw);
  if (!parsed.ok) return fail("Confira os campos.", parsed.fieldErrors);

  const ctx = await requireOrg();
  if (!can(ctx, "communication.send")) return fail(DENIED);
  const { supabase, orgId, user } = ctx;

  try {
    const { channel, subject, body, audienceKind, audienceRef } = parsed.data;
    const candidates = await resolveCandidates(supabase, orgId, audienceKind, audienceRef);
    const { recipients, skipped } = partitionByConsent(candidates);

    if (recipients.length === 0) {
      return fail("Ninguém neste público recebe e-mail. Revise o público ou o consentimento.");
    }

    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        org_id: orgId,
        channel,
        subject: subject || null,
        body,
        audience_kind: audienceKind,
        audience_ref: storableAudienceRef(audienceKind, audienceRef) as unknown as Json,
        status: "queued",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (msgErr || !msg) return fail(toMessage(msgErr, "Não consegui preparar o envio."));

    // Snapshot: to_name (usado no {nome}) + to_email por destinatário. Pulados vão
    // como skipped, com o motivo no `error` — o registro mostra tudo.
    const rows = [
      ...recipients.map((r) => ({
        org_id: orgId,
        message_id: msg.id,
        stick_id: r.stickId,
        to_name: r.name,
        to_email: r.email,
        status: "pending" as const,
      })),
      ...skipped.map((s) => ({
        org_id: orgId,
        message_id: msg.id,
        stick_id: s.stickId,
        to_name: s.name,
        to_email: null,
        status: "skipped" as const,
        error: s.reason,
      })),
    ];

    const { error: recErr } = await supabase.from("message_recipients").insert(rows);
    if (recErr) {
      await supabase.from("messages").delete().eq("id", msg.id);
      return fail(toMessage(recErr, "Não consegui registrar os destinatários."));
    }

    revalidatePath("/communication");
    return ok({ messageId: msg.id, queued: recipients.length, skipped: skipped.length });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Dispara a entrega real de uma mensagem já preparada. Invoca a edge function
// `send-message` AUTENTICADA (o supabase-js do SSR anexa o JWT; o RLS communication.send
// é a barreira — sem service_role). A função lê os destinatários `pending`, envia via
// Resend e atualiza os status; aqui só traduzimos o retorno/erros e revalidamos as telas.
export async function sendMessage(messageId: string): Promise<ActionResult<SendOutcome>> {
  const id = (messageId ?? "").trim();
  if (!id) return fail("Mensagem inválida.");

  const ctx = await requireOrg();
  if (!can(ctx, "communication.send")) return fail(DENIED);

  try {
    const { data, error } = await ctx.supabase.functions.invoke<{
      ok: boolean;
      processed: ProcessedEntry[];
    }>("send-message", { body: { message_id: id } });

    if (error) {
      // Não-2xx da função → FunctionsHttpError com a Response em `context`. Lê status e o
      // código do corpo ({ error }) para dar a mensagem certa (503/401/404).
      if (error instanceof FunctionsHttpError) {
        const status = error.context.status;
        let code = "";
        try {
          const parsed = (await error.context.json()) as { error?: string } | null;
          code = parsed?.error ?? "";
        } catch {
          // corpo não-JSON: decide só pelo status HTTP.
        }
        if (status === 503 || code === "provider_not_configured") return fail(PROVIDER_NOT_CONFIGURED);
        if (status === 401 || code === "unauthorized") return fail(DENIED);
        if (status === 404 || code === "message_not_found_or_forbidden")
          return fail("Mensagem não encontrada ou sem permissão.");
      }
      return fail(toMessage(error, SEND_FAILED));
    }

    if (!data?.ok) return fail(SEND_FAILED);

    // Sucesso: os status por destinatário e o da mensagem mudaram no banco. Revalida as
    // duas telas (sem polling) para refletir na hora.
    revalidatePath("/communication");
    revalidatePath(`/communication/${id}`);
    return ok(summarizeSend(data.processed ?? []));
  } catch (e) {
    return fail(toMessage(e, SEND_FAILED));
  }
}

// Opcional: salvar a composição atual como modelo reaproveitável.
export async function saveTemplate(input: { name: string; subject: string; body: string }): Promise<ActionResult> {
  const name = (input.name ?? "").trim();
  const body = (input.body ?? "").trim();
  if (!name) return fail("Dê um nome ao modelo.");
  if (!body) return fail("O modelo precisa de uma mensagem.");

  const ctx = await requireOrg();
  if (!can(ctx, "communication.send")) return fail(DENIED);

  try {
    const { error } = await ctx.supabase.from("message_templates").insert({
      org_id: ctx.orgId,
      name,
      channel: "email",
      subject: (input.subject ?? "").trim() || null,
      body,
      created_by: ctx.user.id,
    });
    if (error) return fail(toMessage(error, "Não consegui salvar o modelo."));
    revalidatePath("/communication");
    return ok(undefined);
  } catch (e) {
    return fail(toMessage(e));
  }
}
