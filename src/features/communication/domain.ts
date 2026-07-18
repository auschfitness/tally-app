// Domínio PURO da Comunicação (Fase 1). Sem I/O, determinístico, testável:
// resolução do nome ({nome} = preferred || full), substituição do placeholder,
// partição por consentimento (quem recebe × quem é pulado), rótulos e o recorte
// seguro do audience_ref para gravação. A leitura do banco (quem são os candidatos)
// vive em queries.ts; aqui só a lógica.
import type {
  AudienceKind,
  AudienceRef,
  Candidate,
  Recipient,
  Resolution,
  Skipped,
} from "./types";

// Nome de exibição / valor do {nome}: apelido quando houver, senão o nome completo.
export function displayName(c: { preferredName?: string | null; fullName: string }): string {
  const preferred = (c.preferredName ?? "").trim();
  return preferred || c.fullName;
}

// Substitui TODAS as ocorrências de {nome} pelo nome do destinatário. É o que o
// orquestrador aplica por pessoa no envio; a pré-visualização usa o mesmo aqui.
export function applyPlaceholder(text: string, name: string): string {
  return text.replace(/\{nome\}/g, name);
}

// True se o corpo usa o placeholder (para avisar na prévia).
export function usesPlaceholder(text: string): boolean {
  return /\{nome\}/.test(text);
}

const REASON_NO_CONSENT = "Não autoriza e-mail";
const REASON_NO_EMAIL = "Sem e-mail";

// Núcleo da pré-visualização: dedup por Stick, depois filtra por consentimento.
// Só recebe quem tem email_allowed=true E e-mail não vazio; o resto é pulado com o
// motivo. Ninguém some — todos aparecem em `recipients` ou `skipped`.
export function partitionByConsent(candidates: Candidate[]): Resolution {
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  const skipped: Skipped[] = [];

  for (const c of candidates) {
    if (seen.has(c.stickId)) continue;
    seen.add(c.stickId);

    const name = displayName(c);
    const email = (c.email ?? "").trim();

    if (!c.emailAllowed) {
      skipped.push({ stickId: c.stickId, name, reason: REASON_NO_CONSENT });
      continue;
    }
    if (!email) {
      skipped.push({ stickId: c.stickId, name, reason: REASON_NO_EMAIL });
      continue;
    }
    recipients.push({ stickId: c.stickId, name, email });
  }

  return { recipients, skipped };
}

// ---- Rótulos (PT-BR) ----

export const AUDIENCE_KINDS: { key: AudienceKind; label: string; hint: string }[] = [
  { key: "all", label: "Todos", hint: "Toda a igreja que autoriza e-mail" },
  { key: "group", label: "Grupo", hint: "Membros ativos de um grupo" },
  { key: "signal", label: "Signal", hint: "Pessoas com um Signal ativo" },
  { key: "care", label: "Cuidado", hint: "Pessoas com cuidado em aberto" },
  { key: "manual", label: "Manual", hint: "Escolha pessoa por pessoa" },
];

const AUDIENCE_LABEL = new Map(AUDIENCE_KINDS.map((a) => [a.key, a.label]));

export function audienceLabel(kind: string): string {
  return AUDIENCE_LABEL.get(kind as AudienceKind) ?? "Público";
}

export function messageStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "queued":
      return "Preparada";
    case "sending":
      return "Enviando";
    case "sent":
      return "Enviada";
    case "failed":
      return "Falhou";
    default:
      return status;
  }
}

export function recipientStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Na fila";
    case "sent":
      return "Enviado";
    case "failed":
      return "Falhou";
    case "skipped":
      return "Pulado";
    default:
      return status;
  }
}

// Recorte SEGURO do audience_ref para gravar em messages. Guarda só o necessário
// para o registro; para Care grava vazio — nunca expõe detalhe do cuidado.
export function storableAudienceRef(kind: AudienceKind, ref: AudienceRef): Record<string, unknown> {
  switch (kind) {
    case "group":
      return ref.groupId ? { groupId: ref.groupId } : {};
    case "signal":
      return { signalType: ref.signalType ?? "", signalCategory: ref.signalCategory ?? "" };
    case "manual":
      return { stickIds: ref.stickIds ?? [] };
    case "care":
    case "all":
    default:
      return {};
  }
}
