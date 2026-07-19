// Consultas das Mensagens diretas (DM — Fase 3). O RLS é SÓ-PARTICIPANTE (mais rígido
// que o resto do app): você só lê threads/mensagens em que é um dos dois lados. O filtro
// explícito por org_id/participante aqui é defesa em profundidade. Três leituras: a lista
// de conversas (com prévia e não-lidas), a conversa aberta e os candidatos a iniciar DM.
import type { DB } from "@/lib/auth/session";
import { countUnread, messagePreview, otherParticipant, sortThreads } from "./domain";
import type { DmCandidate, DmMessage, ThreadDetail, ThreadListItem } from "./types";

// Mapa userId→nome dos membros da org (profiles: full_name → email → "Usuário"). Mesmo
// padrão dos Espaços/Care; profiles pode não ser legível para todos, então cai no que der.
async function memberNameMap(supabase: DB, orgId: string): Promise<Map<string, string>> {
  const mem = await supabase.from("memberships").select("user_id").eq("org_id", orgId);
  const ids = (mem.data ?? []).map((m) => m.user_id);
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const prof = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  for (const p of prof.data ?? []) map.set(p.id, p.full_name || p.email || "Usuário");
  return map;
}

function nameOf(map: Map<string, string>, id: string): string {
  return map.get(id) ?? "Usuário";
}

// Lista de conversas do usuário logado, com o outro participante, a prévia da última
// mensagem e a contagem de não-lidas. Ordenada por recência no domínio.
export async function listThreads(supabase: DB, orgId: string, myId: string): Promise<ThreadListItem[]> {
  const { data: rows } = await supabase
    .from("dm_threads")
    .select("id, user_a, user_b, last_message_at")
    .eq("org_id", orgId)
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);

  const threads = rows ?? [];
  if (threads.length === 0) return [];

  const threadIds = threads.map((t) => t.id);
  // Todas as mensagens das minhas threads, mais nova primeiro: a primeira de cada thread
  // é a última mensagem (prévia); o restante alimenta a contagem de não-lidas. Na escala
  // deste app (poucas contas que logam) isso é barato e evita N consultas.
  const { data: msgRows } = await supabase
    .from("dm_messages")
    .select("thread_id, sender_id, body, read_at, created_at")
    .eq("org_id", orgId)
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  const byThread = new Map<string, { senderId: string; body: string; readAt: string | null; createdAt: string }[]>();
  for (const id of threadIds) byThread.set(id, []);
  for (const m of msgRows ?? []) {
    byThread.get(m.thread_id)?.push({
      senderId: m.sender_id,
      body: m.body,
      readAt: m.read_at,
      createdAt: m.created_at,
    });
  }

  const names = await memberNameMap(supabase, orgId);
  const items: ThreadListItem[] = threads.map((t) => {
    const msgs = byThread.get(t.id) ?? [];
    const last = msgs[0]; // já vem mais nova primeiro
    const other = otherParticipant(t.user_a, t.user_b, myId);
    return {
      id: t.id,
      otherUserId: other,
      otherName: nameOf(names, other),
      lastMessageAt: t.last_message_at,
      lastSenderId: last?.senderId ?? null,
      preview: messagePreview(last?.body ?? ""),
      unreadCount: countUnread(msgs, myId),
    };
  });

  return sortThreads(items);
}

// A conversa aberta: o outro participante + as mensagens em ordem cronológica. Devolve
// null se a thread não existe ou não é minha (o RLS já barra; o null trata o notFound).
export async function getThread(
  supabase: DB,
  orgId: string,
  myId: string,
  threadId: string,
): Promise<ThreadDetail | null> {
  const { data: t } = await supabase
    .from("dm_threads")
    .select("id, user_a, user_b")
    .eq("org_id", orgId)
    .eq("id", threadId)
    .maybeSingle();
  if (!t) return null;
  if (t.user_a !== myId && t.user_b !== myId) return null; // defesa em profundidade

  const { data: mrows } = await supabase
    .from("dm_messages")
    .select("id, sender_id, body, read_at, created_at")
    .eq("org_id", orgId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const messages: DmMessage[] = (mrows ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    body: m.body,
    readAt: m.read_at,
    createdAt: m.created_at,
  }));

  const other = otherParticipant(t.user_a, t.user_b, myId);
  const names = await memberNameMap(supabase, orgId);
  return { id: t.id, otherUserId: other, otherName: nameOf(names, other), messages };
}

// Candidatos a iniciar conversa: membros da org COM conta (memberships → profiles),
// exceto eu. Ordenados por nome. NÃO usa sticks (só quem loga tem DM).
export async function listDmCandidates(supabase: DB, orgId: string, myId: string): Promise<DmCandidate[]> {
  const map = await memberNameMap(supabase, orgId);
  return [...map.entries()]
    .filter(([id]) => id !== myId)
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
