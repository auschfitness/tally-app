"use server";

// Server Actions dos Espaços (Comunicação estilo Basecamp — Fase 1). TODA ação passa
// por requireOrg(); o RLS do banco é a barreira real (ler = membro; criar espaço =
// org.manage; editar/apagar post/comentário = autor ou org.manage). Aqui validamos a
// entrada, damos erro amigável e revalidamos as rotas (sem polling). author_id/created_by
// são sempre o usuário logado — nunca vêm do client.
import { revalidatePath } from "next/cache";
import { requireOrg, can } from "@/lib/auth/session";
import { type ActionResult, ok, fail, done, toMessage } from "@/lib/errors";
import { canManage, nextPosition } from "./domain";
import { listChatMessages } from "./queries";
import type { ChatMessage } from "./types";

const DENIED_MANAGE = "Você não tem permissão para administrar espaços.";
const DENIED_EDIT = "Só o autor ou quem administra a igreja pode editar isto.";

// Define quem enxerga o espaço (só liderança × todos os membros). Gated org.manage. O RLS
// (can_see_space) aplica a regra em cascata; aqui só gravamos a escolha.
export async function setSpaceVisibility(
  spaceId: string,
  visibility: unknown,
): Promise<ActionResult<{ visibility: "leaders" | "members" }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "org.manage")) return fail(DENIED_MANAGE);
  if (visibility !== "leaders" && visibility !== "members") {
    return fail("Escolha uma visibilidade válida.");
  }
  try {
    const { error } = await ctx.supabase
      .from("spaces")
      .update({ visibility })
      .eq("org_id", ctx.orgId)
      .eq("id", spaceId);
    if (error) return fail(toMessage(error, "Não consegui salvar a visibilidade."));

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath("/spaces");
    return ok({ visibility });
  } catch (e) {
    return fail(toMessage(e));
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Cria um espaço. Gated org.manage. Igreja é única por org (bloqueia duplicar);
// ministério/grupo apontam para o registro via ref_id e denormalizam o nome.
export async function createSpace(input: {
  kind: unknown;
  refId?: unknown;
  name?: unknown;
  description?: unknown;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  if (!can(ctx, "org.manage")) return fail(DENIED_MANAGE);
  const { supabase, orgId, user } = ctx;

  const kind = input.kind;
  if (kind !== "church" && kind !== "ministry" && kind !== "group") {
    return fail("Escolha um tipo de espaço válido.");
  }

  try {
    let refId: string | null = null;
    let name = "";
    const description = str(input.description);

    if (kind === "church") {
      const { data: existing } = await supabase
        .from("spaces")
        .select("id")
        .eq("org_id", orgId)
        .eq("kind", "church")
        .limit(1)
        .maybeSingle();
      if (existing) return fail("A Igreja já tem um espaço.");
      name = str(input.name) || "Igreja";
    } else {
      refId = str(input.refId);
      if (!refId) return fail(kind === "ministry" ? "Escolha o ministério." : "Escolha o grupo.");

      const { data: dup } = await supabase
        .from("spaces")
        .select("id")
        .eq("org_id", orgId)
        .eq("kind", kind)
        .eq("ref_id", refId)
        .limit(1)
        .maybeSingle();
      if (dup) return fail(`Esse ${kind === "ministry" ? "ministério" : "grupo"} já tem um espaço.`);

      // Nome denormalizado do ministério/grupo (fonte da verdade na criação).
      const ref =
        kind === "ministry"
          ? await supabase.from("ministries").select("name").eq("org_id", orgId).eq("id", refId).maybeSingle()
          : await supabase.from("groups").select("name").eq("org_id", orgId).eq("id", refId).maybeSingle();
      if (!ref.data) return fail("Registro não encontrado.");
      name = str(input.name) || ref.data.name;
    }

    const { data: sp, error } = await supabase
      .from("spaces")
      .insert({
        org_id: orgId,
        kind,
        ref_id: refId,
        name,
        description: description || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !sp) return fail(toMessage(error, "Não consegui criar o espaço."));

    revalidatePath("/spaces");
    return ok({ id: sp.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Novo post no quadro do espaço. Criar = membro (author = usuário logado).
export async function createPost(
  spaceId: string,
  input: { title?: unknown; body?: unknown },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;

  const title = str(input.title);
  const body = str(input.body);
  if (!title) return fail("Escreva um título.");
  if (!body) return fail("Escreva o conteúdo do post.");

  try {
    const { data, error } = await supabase
      .from("space_posts")
      .insert({ org_id: orgId, space_id: spaceId, author_id: user.id, title, body })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui publicar o post."));

    revalidatePath(`/spaces/${spaceId}`);
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Comentar num post. Criar = membro.
export async function addComment(
  postId: string,
  spaceId: string,
  input: { body?: unknown },
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;

  const body = str(input.body);
  if (!body) return fail("Escreva um comentário.");

  try {
    const { error } = await supabase
      .from("space_post_comments")
      .insert({ org_id: orgId, post_id: postId, author_id: user.id, body });
    if (error) return fail(toMessage(error, "Não consegui comentar."));

    revalidatePath(`/spaces/${spaceId}/posts/${postId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Confere se o usuário pode gerenciar um post (autor ou org.manage). Devolve o author_id
// lido ou null se o post não existe.
async function assertCanManagePost(
  ctx: Awaited<ReturnType<typeof requireOrg>>,
  postId: string,
): Promise<{ ok: true } | { ok: false; result: ActionResult<never> }> {
  const { supabase, orgId, user } = ctx;
  const { data: p } = await supabase
    .from("space_posts")
    .select("author_id")
    .eq("org_id", orgId)
    .eq("id", postId)
    .maybeSingle();
  if (!p) return { ok: false, result: fail("Post não encontrado.") };
  if (!canManage(user.id, p.author_id ?? "", can(ctx, "org.manage"))) {
    return { ok: false, result: fail(DENIED_EDIT) };
  }
  return { ok: true };
}

// Editar post (autor ou org.manage).
export async function editPost(
  postId: string,
  spaceId: string,
  input: { title?: unknown; body?: unknown },
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const title = str(input.title);
  const body = str(input.body);
  if (!title) return fail("Escreva um título.");
  if (!body) return fail("Escreva o conteúdo do post.");

  try {
    const guard = await assertCanManagePost(ctx, postId);
    if (!guard.ok) return guard.result;

    const { error } = await ctx.supabase
      .from("space_posts")
      .update({ title, body, updated_at: new Date().toISOString() })
      .eq("id", postId);
    if (error) return fail(toMessage(error, "Não consegui salvar o post."));

    revalidatePath(`/spaces/${spaceId}/posts/${postId}`);
    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Excluir post (autor ou org.manage). A UI redireciona para o quadro depois.
export async function deletePost(postId: string, spaceId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    const guard = await assertCanManagePost(ctx, postId);
    if (!guard.ok) return guard.result;

    const { error } = await ctx.supabase.from("space_posts").delete().eq("id", postId);
    if (error) return fail(toMessage(error, "Não consegui excluir o post."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Fixar/desafixar um post (autor ou org.manage).
export async function togglePin(postId: string, spaceId: string): Promise<ActionResult<{ pinned: boolean }>> {
  const ctx = await requireOrg();
  try {
    const { supabase, orgId, user } = ctx;
    const { data: p } = await supabase
      .from("space_posts")
      .select("author_id, pinned")
      .eq("org_id", orgId)
      .eq("id", postId)
      .maybeSingle();
    if (!p) return fail("Post não encontrado.");
    if (!canManage(user.id, p.author_id ?? "", can(ctx, "org.manage"))) return fail(DENIED_EDIT);

    const next = !p.pinned;
    const { error } = await supabase.from("space_posts").update({ pinned: next }).eq("id", postId);
    if (error) return fail(toMessage(error, "Não consegui fixar o post."));

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/posts/${postId}`);
    return ok({ pinned: next });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Arquivar um post (autor ou org.manage) — some do quadro sem apagar o histórico.
export async function archivePost(postId: string, spaceId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    const guard = await assertCanManagePost(ctx, postId);
    if (!guard.ok) return guard.result;

    const { error } = await ctx.supabase.from("space_posts").update({ archived: true }).eq("id", postId);
    if (error) return fail(toMessage(error, "Não consegui arquivar o post."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Editar comentário (autor ou org.manage).
export async function editComment(
  commentId: string,
  postId: string,
  spaceId: string,
  input: { body?: unknown },
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const body = str(input.body);
  if (!body) return fail("Escreva um comentário.");

  try {
    const { supabase, orgId, user } = ctx;
    const { data: c } = await supabase
      .from("space_post_comments")
      .select("author_id")
      .eq("org_id", orgId)
      .eq("id", commentId)
      .maybeSingle();
    if (!c) return fail("Comentário não encontrado.");
    if (!canManage(user.id, c.author_id ?? "", can(ctx, "org.manage"))) return fail(DENIED_EDIT);

    const { error } = await supabase
      .from("space_post_comments")
      .update({ body, updated_at: new Date().toISOString() })
      .eq("id", commentId);
    if (error) return fail(toMessage(error, "Não consegui salvar o comentário."));

    revalidatePath(`/spaces/${spaceId}/posts/${postId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Excluir comentário (autor ou org.manage).
export async function deleteComment(commentId: string, postId: string, spaceId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    const { supabase, orgId, user } = ctx;
    const { data: c } = await supabase
      .from("space_post_comments")
      .select("author_id")
      .eq("org_id", orgId)
      .eq("id", commentId)
      .maybeSingle();
    if (!c) return fail("Comentário não encontrado.");
    if (!canManage(user.id, c.author_id ?? "", can(ctx, "org.manage"))) return fail(DENIED_EDIT);

    const { error } = await supabase.from("space_post_comments").delete().eq("id", commentId);
    if (error) return fail(toMessage(error, "Não consegui excluir o comentário."));

    revalidatePath(`/spaces/${spaceId}/posts/${postId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// ==================== Tarefas (Fase 2) ====================

function normDate(v: unknown): string | null {
  const s = str(v);
  // Aceita só aaaa-mm-dd; qualquer outra coisa vira null (sem prazo).
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Confere se o usuário pode gerenciar uma lista (criador ou org.manage).
async function assertCanManageList(
  ctx: Awaited<ReturnType<typeof requireOrg>>,
  listId: string,
): Promise<{ ok: true } | { ok: false; result: ActionResult<never> }> {
  const { supabase, orgId, user } = ctx;
  const { data: l } = await supabase
    .from("space_todo_lists")
    .select("created_by")
    .eq("org_id", orgId)
    .eq("id", listId)
    .maybeSingle();
  if (!l) return { ok: false, result: fail("Lista não encontrada.") };
  if (!canManage(user.id, l.created_by ?? "", can(ctx, "org.manage"))) {
    return { ok: false, result: fail(DENIED_EDIT) };
  }
  return { ok: true };
}

// Criar lista de tarefas. Criar = membro.
export async function createTodoList(
  spaceId: string,
  input: { name?: unknown },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;
  const name = str(input.name);
  if (!name) return fail("Dê um nome à lista.");

  try {
    const { data, error } = await supabase
      .from("space_todo_lists")
      .insert({ org_id: orgId, space_id: spaceId, name, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui criar a lista."));

    revalidatePath(`/spaces/${spaceId}`);
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Renomear lista (criador ou org.manage).
export async function renameTodoList(
  listId: string,
  spaceId: string,
  input: { name?: unknown },
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const name = str(input.name);
  if (!name) return fail("Dê um nome à lista.");

  try {
    const guard = await assertCanManageList(ctx, listId);
    if (!guard.ok) return guard.result;

    const { error } = await ctx.supabase
      .from("space_todo_lists")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", listId);
    if (error) return fail(toMessage(error, "Não consegui renomear a lista."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Arquivar lista (criador ou org.manage) — some da visão sem apagar.
export async function archiveTodoList(listId: string, spaceId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    const guard = await assertCanManageList(ctx, listId);
    if (!guard.ok) return guard.result;

    const { error } = await ctx.supabase
      .from("space_todo_lists")
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq("id", listId);
    if (error) return fail(toMessage(error, "Não consegui arquivar a lista."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Adicionar item a uma lista. Criar = membro. Responsável/prazo/notas opcionais.
export async function addTodo(
  spaceId: string,
  listId: string,
  input: { title?: unknown; assigneeId?: unknown; dueOn?: unknown; notes?: unknown },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;
  const title = str(input.title);
  if (!title) return fail("Escreva o título da tarefa.");

  try {
    // Nova posição = fim da fila da lista.
    const { data: positions } = await supabase
      .from("space_todos")
      .select("position")
      .eq("org_id", orgId)
      .eq("list_id", listId);
    const position = nextPosition(positions ?? []);

    const { data, error } = await supabase
      .from("space_todos")
      .insert({
        org_id: orgId,
        space_id: spaceId,
        list_id: listId,
        title,
        notes: str(input.notes) || null,
        assignee_id: str(input.assigneeId) || null,
        due_on: normDate(input.dueOn),
        position,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui adicionar a tarefa."));

    revalidatePath(`/spaces/${spaceId}`);
    return ok({ id: data.id });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Editar item (título/responsável/prazo/notas). Atualizar = qualquer membro (colaborativo).
export async function editTodo(
  todoId: string,
  spaceId: string,
  input: { title?: unknown; assigneeId?: unknown; dueOn?: unknown; notes?: unknown },
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const title = str(input.title);
  if (!title) return fail("Escreva o título da tarefa.");

  try {
    const { error } = await ctx.supabase
      .from("space_todos")
      .update({
        title,
        notes: str(input.notes) || null,
        assignee_id: str(input.assigneeId) || null,
        due_on: normDate(input.dueOn),
        updated_at: new Date().toISOString(),
      })
      .eq("id", todoId);
    if (error) return fail(toMessage(error, "Não consegui salvar a tarefa."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Concluir/reabrir item. Qualquer membro. Grava done_at/done_by ao concluir; limpa ao reabrir.
export async function toggleTodo(todoId: string, spaceId: string, markDone: boolean): Promise<ActionResult> {
  const ctx = await requireOrg();
  const { supabase, user } = ctx;
  try {
    const { error } = await supabase
      .from("space_todos")
      .update({
        done: markDone,
        done_at: markDone ? new Date().toISOString() : null,
        done_by: markDone ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", todoId);
    if (error) return fail(toMessage(error, "Não consegui atualizar a tarefa."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Excluir item (criador ou org.manage).
export async function deleteTodo(todoId: string, spaceId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  try {
    const { supabase, orgId, user } = ctx;
    const { data: t } = await supabase
      .from("space_todos")
      .select("created_by")
      .eq("org_id", orgId)
      .eq("id", todoId)
      .maybeSingle();
    if (!t) return fail("Tarefa não encontrada.");
    if (!canManage(user.id, t.created_by ?? "", can(ctx, "org.manage"))) return fail(DENIED_EDIT);

    const { error } = await supabase.from("space_todos").delete().eq("id", todoId);
    if (error) return fail(toMessage(error, "Não consegui excluir a tarefa."));

    revalidatePath(`/spaces/${spaceId}`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// ==================== Chat ao vivo (Fase 4) ====================

// Envia uma mensagem no chat do espaço. Inserir = quem enxerga o espaço (RLS can_see_space);
// sender_id é sempre o usuário logado. Devolve id/created_at para o cliente exibir na hora
// (otimista); o eco do tempo real é deduplicado por id. Revalida a rota para reentradas.
export async function sendChatMessage(
  spaceId: string,
  input: { body?: unknown },
): Promise<ActionResult<{ id: string; createdAt: string }>> {
  const ctx = await requireOrg();
  const { supabase, orgId, user } = ctx;
  const body = str(input.body);
  if (!body) return fail("Escreva uma mensagem.");

  try {
    const { data, error } = await supabase
      .from("space_chat_messages")
      .insert({ org_id: orgId, space_id: spaceId, sender_id: user.id, body })
      .select("id, created_at")
      .single();
    if (error || !data) return fail(toMessage(error, "Não consegui enviar a mensagem."));

    revalidatePath(`/spaces/${spaceId}/chat`);
    return ok({ id: data.id, createdAt: data.created_at });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Apaga uma mensagem do chat. O RLS só deixa o remetente ou quem tem org.manage; o filtro
// explícito por org é defesa em profundidade. A UI só oferece o botão nessas condições.
export async function deleteChatMessage(messageId: string, spaceId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  try {
    const { error } = await supabase
      .from("space_chat_messages")
      .delete()
      .eq("org_id", orgId)
      .eq("id", messageId);
    if (error) return fail(toMessage(error, "Não consegui excluir a mensagem."));

    revalidatePath(`/spaces/${spaceId}/chat`);
    return done();
  } catch (e) {
    return fail(toMessage(e));
  }
}

// Carrega um lote de mensagens ANTERIORES a `before` (ISO) — o "carregar mais antigas".
export async function loadOlderChat(
  spaceId: string,
  before: string,
): Promise<ActionResult<{ messages: ChatMessage[]; hasMore: boolean }>> {
  const { supabase, orgId } = await requireOrg();
  try {
    const page = await listChatMessages(supabase, orgId, spaceId, { before });
    return ok(page);
  } catch (e) {
    return fail(toMessage(e));
  }
}
