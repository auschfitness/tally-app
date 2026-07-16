// Caminho de presença COMPARTILHADO (Groups, Services, Events, Teaching). As
// tabelas `attendance_sessions`/`attendance_records` são as mesmas para todos os
// contextos; o enum `context_type` (service|group|event|teaching) separa os usos.
// UMA fonte de verdade — não duplicar por feature. Ver docs/handoffs/services-supabase.md.
//
// `attendance_records` não tem org_id (isolada pelo pai via RLS). UNIQUE
// (session_id, stick_id). `session_date` é DATE NOT NULL. status é enum.
import type { DB } from "@/lib/auth/session";

export type AttendanceContext = "service" | "group" | "event" | "teaching";
export type AttendanceStatus = "present" | "absent" | "excused" | "unknown";

export interface AttendanceSession {
  id: string;
  date: string;
  count: number; // presentes
  presentIds: string[]; // stick_ids presentes
}

// Resolve o campus por NOME → id (cria se não existir). campus é NOME no app e
// `campus_id` uuid na tabela (FK → campuses). Compartilhado por quem grava presença.
export async function ensureCampusId(supabase: DB, orgId: string, name: string): Promise<string | null> {
  if (!name) return null;
  const found = await supabase.from("campuses").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  if (found.data) return found.data.id;
  const created = await supabase.from("campuses").insert({ org_id: orgId, name }).select("id").single();
  return created.data?.id ?? null;
}

// Ocorrências de presença de um contexto, recentes primeiro, com os presentes.
export async function listAttendanceSessions(
  supabase: DB,
  orgId: string,
  contextType: AttendanceContext,
  contextId: string,
): Promise<AttendanceSession[]> {
  const sessRes = await supabase
    .from("attendance_sessions")
    .select("id, session_date")
    .eq("org_id", orgId)
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .order("session_date", { ascending: false });

  const sessions = sessRes.data ?? [];
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const recRes = await supabase
    .from("attendance_records")
    .select("session_id, stick_id")
    .in("session_id", ids)
    .eq("status", "present");

  const bySession = new Map<string, string[]>();
  for (const r of recRes.data ?? []) (bySession.get(r.session_id) ?? bySession.set(r.session_id, []).get(r.session_id)!).push(r.stick_id);

  return sessions.map((s) => {
    const present = bySession.get(s.id) ?? [];
    return { id: s.id, date: s.session_date ?? "", count: present.length, presentIds: present };
  });
}

// Registra uma ocorrência: cria a sessão + N registros 'present' (source='checkin').
// `campusId` já resolvido pelo chamador (via ensureCampusId). Mesmo caminho de Groups.
export async function recordAttendance(
  supabase: DB,
  orgId: string,
  params: { contextType: AttendanceContext; contextId: string; campusId: string | null; stickIds: string[]; sessionDate: string },
): Promise<{ error?: string }> {
  const { data: session, error: sErr } = await supabase
    .from("attendance_sessions")
    .insert({
      org_id: orgId,
      context_type: params.contextType,
      context_id: params.contextId,
      campus_id: params.campusId,
      session_date: params.sessionDate,
    })
    .select("id")
    .single();
  if (sErr || !session) return { error: sErr?.message ?? "Não consegui criar a sessão." };

  const records = params.stickIds.map((stick_id) => ({
    session_id: session.id,
    stick_id,
    status: "present" as const,
    source: "checkin",
  }));
  const { error: rErr } = await supabase.from("attendance_records").insert(records);
  if (rErr) return { error: rErr.message };
  return {};
}
