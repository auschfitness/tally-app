// Consultas da Comunicação. O RLS (communication.send) já restringe; o filtro
// explícito por org_id é defesa em profundidade. Opções de público, resolução dos
// candidatos (por tipo de público), histórico de mensagens e detalhe com
// destinatários. Nada de detalhe do Care vaza para fora daqui.
import type { DB } from "@/lib/auth/session";
import { displayName } from "./domain";
import type {
  AudienceKind,
  AudienceOptions,
  AudienceRef,
  Candidate,
  MessageDetail,
  MessageListItem,
  MessageRecipientRow,
  MessageStatus,
  RecipientStatus,
  StickOption,
  Template,
} from "./types";

const STICK_COLS = "id, full_name, preferred_name, email, email_allowed";

function toCandidate(r: {
  id: string;
  full_name: string;
  preferred_name: string | null;
  email: string | null;
  email_allowed: boolean;
}): Candidate {
  return {
    stickId: r.id,
    fullName: r.full_name,
    preferredName: r.preferred_name ?? "",
    email: r.email ?? "",
    emailAllowed: Boolean(r.email_allowed),
  };
}

// Opções para o seletor de público: grupos ativos e combinações de Signal ativas.
export async function listAudienceOptions(supabase: DB, orgId: string): Promise<AudienceOptions> {
  const [groupsRes, signalsRes] = await Promise.all([
    supabase.from("groups").select("id, name").eq("org_id", orgId).eq("archived", false).order("name"),
    supabase
      .from("signals")
      .select("type, category, related_stick_id")
      .eq("org_id", orgId)
      .not("related_stick_id", "is", null)
      .not("status", "in", "(resolved,dismissed)"),
  ]);

  const groups = (groupsRes.data ?? []).map((g) => ({ id: g.id, name: g.name }));

  // Combos (tipo, categoria) → nº de Sticks distintas com Signal ativo.
  const combo = new Map<string, { type: string; category: string; sticks: Set<string> }>();
  for (const s of signalsRes.data ?? []) {
    if (!s.related_stick_id) continue;
    const key = `${s.type}␟${s.category}`;
    let entry = combo.get(key);
    if (!entry) {
      entry = { type: s.type, category: s.category, sticks: new Set() };
      combo.set(key, entry);
    }
    entry.sticks.add(s.related_stick_id);
  }
  const signals = [...combo.values()]
    .map((c) => ({ type: c.type, category: c.category, count: c.sticks.size }))
    .sort((a, b) => b.count - a.count);

  return { groups, signals };
}

// Sticks não arquivadas para o seletor manual (nome já resolvido).
export async function listManualSticks(supabase: DB, orgId: string): Promise<StickOption[]> {
  const { data } = await supabase
    .from("sticks")
    .select(STICK_COLS)
    .eq("org_id", orgId)
    .eq("archived", false)
    .order("full_name");
  return (data ?? []).map((r) => ({
    id: r.id,
    name: displayName({ preferredName: r.preferred_name, fullName: r.full_name }),
    email: r.email ?? "",
    emailAllowed: Boolean(r.email_allowed),
  }));
}

// Carrega Sticks (não arquivadas) por lista de ids, como candidatos.
async function loadSticksByIds(supabase: DB, orgId: string, ids: string[]): Promise<Candidate[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const { data } = await supabase
    .from("sticks")
    .select(STICK_COLS)
    .eq("org_id", orgId)
    .eq("archived", false)
    .in("id", unique);
  return (data ?? []).map(toCandidate);
}

// Resolve os CANDIDATOS de um público (antes do consentimento). Impuro: lê o banco.
// A partição por consentimento é feita no domínio puro pela action.
export async function resolveCandidates(
  supabase: DB,
  orgId: string,
  kind: AudienceKind,
  ref: AudienceRef,
): Promise<Candidate[]> {
  switch (kind) {
    case "all": {
      const { data } = await supabase
        .from("sticks")
        .select(STICK_COLS)
        .eq("org_id", orgId)
        .eq("archived", false)
        .order("full_name");
      return (data ?? []).map(toCandidate);
    }
    case "group": {
      if (!ref.groupId) return [];
      const { data } = await supabase
        .from("group_members")
        .select("stick_id")
        .eq("group_id", ref.groupId)
        .eq("status", "active");
      return loadSticksByIds(supabase, orgId, (data ?? []).map((m) => m.stick_id));
    }
    case "signal": {
      if (!ref.signalType || !ref.signalCategory) return [];
      const { data } = await supabase
        .from("signals")
        .select("related_stick_id")
        .eq("org_id", orgId)
        .eq("type", ref.signalType)
        .eq("category", ref.signalCategory)
        .not("related_stick_id", "is", null)
        .not("status", "in", "(resolved,dismissed)");
      const ids = (data ?? []).map((s) => s.related_stick_id).filter((x): x is string => Boolean(x));
      return loadSticksByIds(supabase, orgId, ids);
    }
    case "care": {
      // Sticks com cuidado em aberto. NÃO expõe título/categoria do Care — só o id.
      const { data } = await supabase
        .from("care_items")
        .select("stick_id")
        .eq("org_id", orgId)
        .not("stick_id", "is", null)
        .not("status", "in", "(resolved,closed)");
      const ids = (data ?? []).map((c) => c.stick_id).filter((x): x is string => Boolean(x));
      return loadSticksByIds(supabase, orgId, ids);
    }
    case "manual": {
      return loadSticksByIds(supabase, orgId, ref.stickIds ?? []);
    }
    default:
      return [];
  }
}

// ---- Modelos (message_templates) ----

export async function listTemplates(supabase: DB, orgId: string): Promise<Template[]> {
  const { data } = await supabase
    .from("message_templates")
    .select("id, name, subject, body")
    .eq("org_id", orgId)
    .eq("channel", "email")
    .order("updated_at", { ascending: false });
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject ?? "",
    body: t.body,
  }));
}

// ---- Histórico ----

function asMessageStatus(s: string | null): MessageStatus {
  const ok: MessageStatus[] = ["draft", "queued", "sending", "sent", "failed"];
  return ok.includes(s as MessageStatus) ? (s as MessageStatus) : "draft";
}
function asRecipientStatus(s: string | null): RecipientStatus {
  const ok: RecipientStatus[] = ["pending", "sent", "failed", "skipped"];
  return ok.includes(s as RecipientStatus) ? (s as RecipientStatus) : "pending";
}
function asAudienceKind(s: string | null): AudienceKind {
  const ok: AudienceKind[] = ["all", "group", "signal", "care", "manual"];
  return ok.includes(s as AudienceKind) ? (s as AudienceKind) : "all";
}

// Lista as mensagens (recentes primeiro) com a contagem de destinatários por status.
export async function listMessages(supabase: DB, orgId: string): Promise<MessageListItem[]> {
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, subject, audience_kind, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const rows = msgs ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((m) => m.id);
  const { data: recs } = await supabase
    .from("message_recipients")
    .select("message_id, status")
    .eq("org_id", orgId)
    .in("message_id", ids);

  const counts = new Map<string, { total: number; pending: number; sent: number; skipped: number; failed: number }>();
  for (const id of ids) counts.set(id, { total: 0, pending: 0, sent: 0, skipped: 0, failed: 0 });
  for (const r of recs ?? []) {
    const c = counts.get(r.message_id);
    if (!c) continue;
    c.total += 1;
    const st = asRecipientStatus(r.status);
    c[st] += 1;
  }

  return rows.map((m): MessageListItem => {
    const c = counts.get(m.id)!;
    return {
      id: m.id,
      subject: m.subject ?? "(sem assunto)",
      audienceKind: asAudienceKind(m.audience_kind),
      status: asMessageStatus(m.status),
      createdAt: m.created_at,
      total: c.total,
      pending: c.pending,
      sent: c.sent,
      skipped: c.skipped,
      failed: c.failed,
    };
  });
}

// Detalhe de uma mensagem + seus destinatários (para a tela [id]).
export async function getMessageDetail(
  supabase: DB,
  orgId: string,
  id: string,
): Promise<{ message: MessageDetail; recipients: MessageRecipientRow[] } | null> {
  const { data: m } = await supabase
    .from("messages")
    .select("id, channel, subject, body, audience_kind, status, created_at, sent_at")
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!m) return null;

  const { data: recs } = await supabase
    .from("message_recipients")
    .select("id, to_name, to_email, status, error, sent_at, read_at, created_at")
    .eq("org_id", orgId)
    .eq("message_id", id)
    .order("to_name");

  const message: MessageDetail = {
    id: m.id,
    channel: m.channel === "in_app" ? "in_app" : "email",
    subject: m.subject ?? "(sem assunto)",
    body: m.body,
    audienceKind: asAudienceKind(m.audience_kind),
    status: asMessageStatus(m.status),
    createdAt: m.created_at,
    sentAt: m.sent_at,
  };

  const recipients = (recs ?? []).map((r): MessageRecipientRow => ({
    id: r.id,
    name: r.to_name ?? "",
    email: r.to_email ?? "",
    status: asRecipientStatus(r.status),
    error: r.error ?? "",
    sentAt: r.sent_at,
    readAt: r.read_at,
  }));

  return { message, recipients };
}
