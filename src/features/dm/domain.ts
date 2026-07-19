// Domínio PURO das Mensagens diretas (DM — Fase 3). Sem I/O, determinístico, testável:
// ordenar o par canônico (o menor id vira user_a — casa com o CHECK user_a < user_b do
// banco), achar o outro participante, contar não-lidas, montar a prévia da última
// mensagem, ordenar as conversas por recência e agrupar as mensagens por dia. A leitura
// do banco vive em queries.ts; aqui só a lógica.
import type { DmMessage } from "./types";

// Par canônico de uma dupla: o menor id (comparação de texto — os uuid do Postgres
// ordenam lexicograficamente na forma canônica) vira user_a. Assim a mesma dupla sempre
// mapeia para a mesma linha (org_id, user_a, user_b) — nunca duas threads pro par.
export function canonicalPair(id1: string, id2: string): { userA: string; userB: string } {
  return id1 < id2 ? { userA: id1, userB: id2 } : { userA: id2, userB: id1 };
}

// Dado os dois lados de uma thread e quem sou eu, devolve o OUTRO participante.
export function otherParticipant(userA: string, userB: string, myId: string): string {
  return userA === myId ? userB : userA;
}

// A mensagem é minha? (para alinhar o balão e liberar o excluir).
export function isMine(senderId: string, myId: string): boolean {
  return senderId === myId;
}

// Não-lida PARA MIM: foi o outro que mandou e ainda não tem read_at.
export function isUnread(msg: { senderId: string; readAt: string | null }, myId: string): boolean {
  return msg.senderId !== myId && !msg.readAt;
}

// Quantas mensagens recebidas continuam sem leitura (para o selo da lista).
export function countUnread(messages: { senderId: string; readAt: string | null }[], myId: string): number {
  return messages.reduce((n, m) => (isUnread(m, myId) ? n + 1 : n), 0);
}

// Há ao menos uma recebida sem leitura? (a conversa decide se chama markThreadRead).
export function hasReceivedUnread(messages: { senderId: string; readAt: string | null }[], myId: string): boolean {
  return messages.some((m) => isUnread(m, myId));
}

// Prévia de uma linha da lista: colapsa quebras/espaços e corta com reticências. Corpo
// vazio (thread recém-criada sem mensagens) vira "".
export function messagePreview(body: string | null | undefined, max = 80): string {
  const clean = (body ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

// Ordena as conversas por recência: mais recente primeiro (last_message_at ISO
// decrescente). Sem última mensagem (thread nova) cai para o fim. Não muta a entrada.
export function sortThreads<T extends { lastMessageAt: string | null }>(threads: T[]): T[] {
  return [...threads].sort((a, b) => {
    const av = a.lastMessageAt ?? "";
    const bv = b.lastMessageAt ?? "";
    if (av === bv) return 0;
    return av < bv ? 1 : -1;
  });
}

// Um dia de mensagens (para o separador de data na conversa).
export interface DayGroup {
  day: string; // aaaa-mm-dd
  messages: DmMessage[];
}

// Agrupa mensagens (em ordem cronológica) por dia, preservando a ordem. O dia sai do
// prefixo aaaa-mm-dd do created_at ISO — determinístico, sem depender do fuso do runtime.
export function groupByDay(messages: DmMessage[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const m of messages) {
    const day = m.createdAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.messages.push(m);
    else groups.push({ day, messages: [m] });
  }
  return groups;
}

// aaaa-mm-dd menos um dia (para rotular "Ontem"). Puro: constrói o Date em UTC a partir
// da própria string, sem ler o relógio.
export function isoMinusOneDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// Rótulo do separador de dia: "Hoje" / "Ontem" / dd/mm/aaaa. `todayIso` entra como
// parâmetro (puro — a página passa o "hoje" no fuso da org).
export function dayLabel(day: string, todayIso: string): string {
  if (day === todayIso) return "Hoje";
  if (day === isoMinusOneDay(todayIso)) return "Ontem";
  return day.split("-").reverse().join("/");
}
