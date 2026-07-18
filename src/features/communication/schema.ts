// Validação da composição (fronteira de Server Action). Nunca confia no client:
// normaliza e checa canal, assunto, corpo e o público (audience_kind + audience_ref).
import type { AudienceKind, Channel, ComposeInput } from "./types";

const AUDIENCE_KINDS: AudienceKind[] = ["all", "group", "signal", "care", "manual"];
const CHANNELS: Channel[] = ["email", "in_app"];

// Entrada crua vinda da UI (nada é de confiança até validar).
export interface RawComposeInput {
  channel?: unknown;
  subject?: unknown;
  body?: unknown;
  audienceKind?: unknown;
  audienceRef?: {
    groupId?: unknown;
    signalType?: unknown;
    signalCategory?: unknown;
    stickIds?: unknown;
  };
}

export type Validated =
  | { ok: true; data: ComposeInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseComposeInput(raw: RawComposeInput): Validated {
  const fieldErrors: Record<string, string[]> = {};

  const channel: Channel = CHANNELS.includes(raw.channel as Channel) ? (raw.channel as Channel) : "email";

  const subject = str(raw.subject);
  if (!subject) fieldErrors.subject = ["Escreva um assunto."];

  const body = str(raw.body);
  if (!body) fieldErrors.body = ["Escreva a mensagem."];

  const audienceKind = raw.audienceKind as AudienceKind;
  if (!AUDIENCE_KINDS.includes(audienceKind)) {
    fieldErrors.audience = ["Escolha um público válido."];
  } else {
    if (audienceKind === "group" && !str(raw.audienceRef?.groupId)) {
      fieldErrors.audience = ["Escolha o grupo."];
    }
    if (audienceKind === "signal" && (!str(raw.audienceRef?.signalType) || !str(raw.audienceRef?.signalCategory))) {
      fieldErrors.audience = ["Escolha o Signal."];
    }
    if (audienceKind === "manual") {
      const ids = Array.isArray(raw.audienceRef?.stickIds)
        ? (raw.audienceRef!.stickIds as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
        : [];
      if (ids.length === 0) fieldErrors.audience = ["Escolha ao menos uma pessoa."];
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const stickIds = Array.isArray(raw.audienceRef?.stickIds)
    ? (raw.audienceRef!.stickIds as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  return {
    ok: true,
    data: {
      channel,
      subject,
      body,
      audienceKind,
      audienceRef: {
        groupId: str(raw.audienceRef?.groupId) || undefined,
        signalType: str(raw.audienceRef?.signalType) || undefined,
        signalCategory: str(raw.audienceRef?.signalCategory) || undefined,
        stickIds,
      },
    },
  };
}
