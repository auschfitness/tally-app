"use server";

// Server Actions das Mensagens diretas (DM — Fase 3). TODA ação passa por requireOrg();
// o RLS SÓ-PARTICIPANTE do banco é a barreira real (ler/escrever = você é um dos dois
// lados; inserir exige sender_id = usuário logado; apagar = só o remetente). Aqui
// validamos a entrada, damos erro amigável e revalidamos as rotas (sem polling — tempo
// real fica pra Fase 4). sender_id é sempre o usuário logado — nunca vem do client. O
// last_message_at da thread é atualizado por trigger no banco — não mexemos nele.
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth/session";
import { type ActionResult, ok, fail, done, toMessage } from "@/lib/errors";
import { canonicalPair } from "./domain";
import { getThread as queryThread, listThreads as queryThreads } from "./queries";
import type { ThreadDetail, ThreadListItem } from "./types";

// Violação de unique (par canônico já existe) — corrida entre dois select-then-insert.
const UNIQUE_VIOLATION = "23505";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Lista de conversas do usuário logado (para /dm).
export async function listThreads(): Promise<ActionResult<ThreadListItem[]>> {
  const { supabase, orgId, user } = await requireOrg();
  try {
    return ok(await queryThreads(supabase, orgId, user.id));
  } catch (e) {
    return fail(toMessage(e));
  }
}

// A conversa aberta (para /dm/[threadId]). Falha se a thread não é minha/não existe.
export async function getThread(threadId: string): Promise<ActionResult<ThreadDetail>> {
  const { supabase, orgId, user } = await requireOrg();
  try {
    const thread = await queryThread(supabase, orgId, user.id, threadId);
    if (!thread) return fail("Conversa não encontrada.");
    return ok(thread);
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Abre a conversa com alguém — reaproveita a existente (par canônico) ou cria uma nova.
// Ordena os dois ids (menor em user_a) e faz select-then-insert; se dois abrirem ao mesmo
// tempo, a unique do banco barra e a gente relê a que venceu. Nunca duas threads pro par.
export async function openOrCreateThread(otherUserId: unknown): Promise<ActionResult<{ id: string }>> {
  const { supabase, orgId, user } = await requireOrg();
  const other = str(otherUserId);
  if (!other) return fail("Escolha com quem conversar.");
  if (other === user.id) return fail("Você não pode conversar consigo mesmo.");

  const { userA, userB } = canonicalPair(user.id, other);

  try {
    // 1) Já existe? (o RLS permite porque sou um dos dois lados.)
    const existing = await supabase
      .from("dm_threads")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_a", userA)
      .eq("user_b", userB)
      .maybeSingle();
    if (existing.data) return ok({ id: existing.data.id });

    // 2) Não existe → cria.
    const insert = await supabase
      .from("dm_threads")
      .insert({ org_id: orgId, user_a: userA, user_b: userB })
      .select("id")
      .single();

    if (insert.error) {
      // Corrida: outra requisição criou a mesma dupla entre o select e o insert. Relê.
      if (insert.error.code === UNIQUE_VIOLATION) {
        const again = await supabase
          .from("dm_threads")
          .select("id")
          .eq("org_id", orgId)
          .eq("user_a", userA)
          .eq("user_b", userB)
          .maybeSingle();
        if (again.data) return ok({ id: again.data.id });
      }
      return fail(toMessage(insert.error, "Não consegui abrir a conversa."));
    }
    if (!insert.data) return fail("Não consegui abrir a conversa.");

    revalidatePath("/dm");
    return ok({ id: insert.data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Envia uma mensagem numa conversa. Inserir = participante com sender_id = usuário logado
// (o RLS confere). O last_message_at é tocado por trigger no banco.
export async function sendMessage(threadId: string, input: { body?: unknown }): Promise<ActionResult> {
  const { supabase, orgId, user } = await requireOrg();
  const body = str(input.body);
  if (!body) return fail("Escreva uma mensagem.");

  try {
    const { error } = await supabase
      .from("dm_messages")
      .insert({ org_id: orgId, thread_id: threadId, sender_id: user.id, body });
    if (error) return fail(toMessage(error, "Não consegui enviar a mensagem."));

    revalidatePath(`/dm/${threadId}`);
    revalidatePath("/dm");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Marca como lidas as mensagens RECEBIDAS (do outro) ainda sem read_at. Chamado ao abrir
// a conversa. Atualizar = participante (RLS). Revalida /dm para limpar o selo de não-lida.
export async function markThreadRead(threadId: string): Promise<ActionResult> {
  const { supabase, orgId, user } = await requireOrg();
  try {
    const { error } = await supabase
      .from("dm_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("thread_id", threadId)
      .neq("sender_id", user.id)
      .is("read_at", null);
    if (error) return fail(toMessage(error, "Não consegui marcar como lida."));

    revalidatePath("/dm");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Apaga uma mensagem própria. O RLS só deixa o remetente apagar; se não for minha, o
// delete não afeta linha nenhuma (e a UI só oferece o botão nas minhas).
export async function deleteMessage(messageId: string, threadId: string): Promise<ActionResult> {
  const { supabase, orgId, user } = await requireOrg();
  try {
    const { error } = await supabase
      .from("dm_messages")
      .delete()
      .eq("org_id", orgId)
      .eq("id", messageId)
      .eq("sender_id", user.id);
    if (error) return fail(toMessage(error, "Não consegui excluir a mensagem."));

    revalidatePath(`/dm/${threadId}`);
    revalidatePath("/dm");
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}
