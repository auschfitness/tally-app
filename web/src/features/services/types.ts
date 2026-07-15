// Modelos de domínio da feature Cultos/Serviços. Um Service é um culto recorrente
// (Domingo 9h, Quarta de oração). Cada OCORRÊNCIA de presença vira uma
// `attendance_sessions` (context_type='service'). `campus` resolvido para NOME.
// Ver docs/handoffs/services-supabase.md.

export type RecurringPattern = "weekly" | "monthly" | "custom";

export interface Service {
  id: string;
  name: string;
  type: string;
  campus: string;
  weekday: number | null; // 0=Domingo .. 6=Sábado
  start_time: string;
  end_time: string;
  location: string;
  recurring_pattern: RecurringPattern;
  description: string;
  active: boolean;
}

// Item da ordem do culto (liturgia). Template = service_id preenchido, session_id null.
export interface PlanItem {
  id: string;
  service_id: string | null;
  session_id: string | null;
  position: number;
  time_label: string;
  title: string;
  duration_min: number | null;
  responsible: string;
  notes: string;
}

// Conexões (só leitura) exibidas no detalhe do culto.
export interface ServiceSermon {
  id: string;
  title: string;
  mainPassage: string;
}
export interface ServiceAssignment {
  id: string;
  team: string;
  role: string;
  person: string;
}
