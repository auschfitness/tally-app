// Modelos de front das Mensagens diretas (DM — Fase 3). Sem I/O: só as formas que a UI,
// o domínio puro e as Server Actions trocam. As linhas do banco (dm_threads, dm_messages)
// são mapeadas para cá nas queries.

// Uma mensagem de uma conversa.
export interface DmMessage {
  id: string;
  senderId: string;
  body: string;
  readAt: string | null; // ISO ou null (recebida ainda não lida)
  createdAt: string; // ISO
}

// Uma conversa na lista (/dm): o outro lado, prévia da última mensagem e não-lidas.
export interface ThreadListItem {
  id: string;
  otherUserId: string;
  otherName: string;
  lastMessageAt: string | null; // ISO ou null (thread sem mensagens)
  lastSenderId: string | null; // quem mandou a última (para o prefixo "Você:")
  preview: string; // prévia da última mensagem (pode ser "")
  unreadCount: number; // recebidas sem leitura
}

// A conversa aberta (/dm/[threadId]): o outro lado + as mensagens em ordem cronológica.
export interface ThreadDetail {
  id: string;
  otherUserId: string;
  otherName: string;
  messages: DmMessage[];
}

// Alguém com quem se pode iniciar conversa: membro da org COM conta (auth.users via
// memberships), exceto eu.
export interface DmCandidate {
  id: string; // user id (auth.users)
  name: string;
}
