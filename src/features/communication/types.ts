// Modelos de front da Comunicação (Fase 1). Sem I/O — só as formas que a UI, o
// domínio puro e as Server Actions trocam. As linhas do banco (messages,
// message_recipients, message_templates) são mapeadas para cá nas queries.

// Canal de entrega. Foco de Fase 1 = e-mail; `in_app` fica no enum para o futuro.
export type Channel = "email" | "in_app";

// Como o público é escolhido (espelha o CHECK do banco em messages.audience_kind).
export type AudienceKind = "all" | "group" | "signal" | "care" | "manual";

// Ciclo de vida da mensagem (messages.status). Fase 1 grava "queued" — a entrega
// real é passo posterior do orquestrador.
export type MessageStatus = "draft" | "queued" | "sending" | "sent" | "failed";

// Situação de cada destinatário (message_recipients.status).
export type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

// Referência do público (messages.audience_ref jsonb). Campos preenchidos conforme
// o `kind`. Nunca carrega detalhe do Care.
export interface AudienceRef {
  groupId?: string;
  signalType?: string;
  signalCategory?: string;
  stickIds?: string[];
}

// Candidato bruto vindo do banco, ANTES do filtro de consentimento.
export interface Candidate {
  stickId: string;
  fullName: string;
  preferredName: string;
  email: string;
  emailAllowed: boolean;
}

// Destinatário que efetivamente recebe (passou no consentimento).
export interface Recipient {
  stickId: string;
  name: string; // preferred_name || full_name (usado no {nome})
  email: string;
}

// Quem foi pulado, com o motivo (sem e-mail / não autoriza).
export interface Skipped {
  stickId: string;
  name: string;
  reason: string;
}

// Resultado da resolução do público (o que a pré-visualização mostra).
export interface Resolution {
  recipients: Recipient[];
  skipped: Skipped[];
}

// Entrada de composição trafegada da UI para as Server Actions. Objeto simples e
// serializável; a validação real vive em schema.ts (nunca confia no client).
export interface ComposeInput {
  channel: Channel;
  subject: string;
  body: string;
  audienceKind: AudienceKind;
  audienceRef: AudienceRef;
}

// Opções para o seletor de público na composição.
export interface GroupOption {
  id: string;
  name: string;
}
export interface SignalOption {
  type: string;
  category: string;
  count: number; // nº de pessoas (Sticks distintas) com esse Signal ativo
}
export interface StickOption {
  id: string;
  name: string;
  email: string;
  emailAllowed: boolean;
}
export interface AudienceOptions {
  groups: GroupOption[];
  signals: SignalOption[];
}

// Modelo salvo (message_templates), reaproveitável na composição.
export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// Item da lista do histórico (uma mensagem + contagem de destinatários).
export interface MessageListItem {
  id: string;
  subject: string;
  audienceKind: AudienceKind;
  status: MessageStatus;
  createdAt: string; // ISO datetime
  total: number;
  pending: number;
  sent: number;
  skipped: number;
  failed: number;
}

// Destinatário como gravado (para a tela de detalhe da mensagem).
export interface MessageRecipientRow {
  id: string;
  name: string;
  email: string;
  status: RecipientStatus;
  error: string;
  sentAt: string | null;
  readAt: string | null;
}

// Uma entrada do `processed` que a edge function `send-message` devolve.
export interface ProcessedEntry {
  message_id: string;
  sent: number;
  failed: number;
}

// Resumo do envio (soma do `processed`) devolvido pela Server Action à UI.
export interface SendOutcome {
  sent: number;
  failed: number;
}

// Cabeçalho da mensagem na tela de detalhe.
export interface MessageDetail {
  id: string;
  channel: Channel;
  subject: string;
  body: string;
  audienceKind: AudienceKind;
  status: MessageStatus;
  createdAt: string;
  sentAt: string | null;
}
