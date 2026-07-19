// Domínio PURO dos convites de membro (contas de membro por convite). Sem I/O,
// determinístico, testável: o estado efetivo de um convite (um "pendente" cujo prazo já
// passou é, na prática, "expirado"), se uma ficha pode ser convidada, o estado de acesso
// de uma pessoa (tem app / convite pendente / nada), o link público e a partição da lista
// (pendentes · expirados · aceitos · revogados). A leitura do banco vive em queries.ts.

// Situação de um convite. No banco a coluna `status` guarda pending/accepted/revoked/
// expired; o prazo (expires_at) transforma um pending vencido em "expired" na prática.
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

const STATUSES: InviteStatus[] = ["pending", "accepted", "revoked", "expired"];

function coerceStatus(raw: string): InviteStatus {
  return (STATUSES as string[]).includes(raw) ? (raw as InviteStatus) : "pending";
}

// Vencido: tem prazo e o prazo é ANTES de agora (comparação lexicográfica de ISO UTC —
// os timestamps do Postgres saem em ISO, que ordena como o tempo). `nowIso` entra como
// parâmetro (puro — a página/action passa o "agora").
export function isExpired(expiresAt: string, nowIso: string): boolean {
  return expiresAt < nowIso;
}

// Estado EFETIVO: um "pending" cujo prazo passou vira "expired"; o resto é o próprio
// status. É o que a UI usa para decidir ações (revogar, gerar novo link…).
export function effectiveStatus(rawStatus: string, expiresAt: string, nowIso: string): InviteStatus {
  const status = coerceStatus(rawStatus);
  if (status === "pending" && isExpired(expiresAt, nowIso)) return "expired";
  return status;
}

const STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Convite pendente",
  accepted: "Aceito",
  revoked: "Revogado",
  expired: "Expirado",
};

export function inviteStatusLabel(status: InviteStatus): string {
  return STATUS_LABEL[status];
}

// Estado de acesso de uma pessoa (ficha), para o indicador: tem conta no app, convite
// pendente aguardando, ou nada ainda.
export type StickAccountState = "active" | "pending" | "none";

export function stickAccountState(userId: string | null, hasPendingInvite: boolean): StickAccountState {
  if (userId) return "active";
  if (hasPendingInvite) return "pending";
  return "none";
}

const ACCOUNT_LABEL: Record<StickAccountState, string> = {
  active: "Tem acesso ao app",
  pending: "Convite pendente",
  none: "Sem acesso",
};

export function stickAccountLabel(state: StickAccountState): string {
  return ACCOUNT_LABEL[state];
}

// Pode convidar? Precisa de e-mail e ainda NÃO ter conta ligada (user_id nulo).
export function canInviteStick(email: string | null, userId: string | null): boolean {
  return Boolean(email && email.trim()) && !userId;
}

// Link público do convite. `origin` vem do navegador (window.location.origin) — puro aqui.
export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/convite/${token}`;
}

// Uma linha de convite já com o status efetivo resolvido (o que a lista de convites usa).
export interface InviteRow {
  status: InviteStatus; // já efetivo
}

// Parte a lista em grupos para a tela de gestão: pendentes (ações), expirados (gerar novo
// link), aceitos (histórico) e revogados (histórico). Preserva a ordem de entrada.
export function partitionInvites<T extends InviteRow>(
  invites: T[],
): { pending: T[]; expired: T[]; accepted: T[]; revoked: T[] } {
  return {
    pending: invites.filter((i) => i.status === "pending"),
    expired: invites.filter((i) => i.status === "expired"),
    accepted: invites.filter((i) => i.status === "accepted"),
    revoked: invites.filter((i) => i.status === "revoked"),
  };
}
