// Modelos de domínio da feature Eventos. Evento especial (conferência, retiro,
// curso) — distinto do culto recorrente. Inscrição + check-in INTERNOS (staff
// logado); página pública/pagamento ADIADOS. Ver docs/handoffs/events-supabase.md.
//
// Data/hora: `event_date` (date) é a fonte da verdade do DIA; `start_time`/`end_time`
// (HH:MM) vêm dos columns timestamptz `starts_at`/`end_time` (extraídos/montados no
// domínio). `campus` resolvido para NOME.

export type EventStatus = "draft" | "active" | "completed" | "cancelled";

export interface EventItem {
  id: string;
  name: string;
  type: string;
  description: string;
  campus: string;
  event_date: string;
  start_time: string; // HH:MM (de starts_at)
  end_time: string; // HH:MM (de end_time timestamptz)
  location: string;
  capacity: number | null;
  registration_required: boolean;
  payment_required: boolean;
  check_in_enabled: boolean;
  status: EventStatus;
  cover_image: string;
}

// Inscrição no evento. `stick_id` null = visitante (não vira Stick). Sem UNIQUE no
// banco (event_id, stick_id) → dedupe é no app (ver actions). Ver handoff ⚠️ alerta 1.
export interface EventRegistration {
  id: string;
  event_id: string;
  stick_id: string | null;
  name: string;
  email: string;
  phone: string;
  household: string;
  payment_status: string;
  checked_in: boolean;
  checked_in_at: string | null;
}
