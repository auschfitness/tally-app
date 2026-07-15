// Validação de entrada (fronteira do servidor). Espelha os formulários do legado.
import type { EventStatus } from "./types";

export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string[]> };

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

const STATUS = ["draft", "active", "completed", "cancelled"] as const;

export interface EventInput {
  name: string;
  type: string;
  campus: string;
  event_date: string;
  status: EventStatus;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number | null;
  description: string;
  registration_required: boolean;
  payment_required: boolean;
  check_in_enabled: boolean;
}
export function parseEventInput(fd: FormData): Validated<EventInput> {
  const name = str(fd, "name");
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome ao evento."] } };
  const capRaw = str(fd, "capacity");
  const cap = capRaw === "" ? null : Number(capRaw);
  const status = str(fd, "status");
  return {
    ok: true,
    data: {
      name,
      type: str(fd, "type"),
      campus: str(fd, "campus"),
      event_date: str(fd, "event_date"),
      status: (STATUS as readonly string[]).includes(status) ? (status as EventStatus) : "active",
      start_time: str(fd, "start_time"),
      end_time: str(fd, "end_time"),
      location: str(fd, "location"),
      capacity: cap !== null && Number.isFinite(cap) && cap >= 0 ? Math.trunc(cap) : null,
      description: str(fd, "description"),
      registration_required: fd.get("registration_required") != null,
      payment_required: fd.get("payment_required") != null,
      check_in_enabled: fd.get("check_in_enabled") != null,
    },
  };
}

export interface RegistrationInput {
  stickId: string;
  name: string;
  email: string;
  phone: string;
  checkedIn: boolean;
}
export function parseRegistrationInput(fd: FormData): Validated<RegistrationInput> {
  const stickId = str(fd, "stickId");
  const name = str(fd, "name");
  // Precisa vincular a uma Stick OU informar o nome do visitante.
  if (!stickId && !name) return { ok: false, fieldErrors: { name: ["Escolha uma pessoa ou informe o nome do visitante."] } };
  return {
    ok: true,
    data: { stickId, name: stickId ? "" : name, email: str(fd, "email"), phone: str(fd, "phone"), checkedIn: fd.get("checkedIn") != null },
  };
}
