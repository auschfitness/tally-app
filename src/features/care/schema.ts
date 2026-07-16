// Validação/coerção na fronteira do servidor. Título é obrigatório; prioridade e
// status são coagidos aos enums reais (signal_priority / care_status). IDs de
// responsável (auth.users) e pessoa (sticks) só passam se forem uuid.
import type { CarePriority, CareStatus } from "./types";

const PRIORITIES: CarePriority[] = ["celebration", "notice", "attention", "urgent"];
const STATUSES: CareStatus[] = ["new", "assigned", "in_progress", "waiting", "resolved", "closed"];

function priOr(v: string, fallback: CarePriority = "attention"): CarePriority {
  return (PRIORITIES as string[]).includes(v) ? (v as CarePriority) : fallback;
}
function statusOr(v: string, fallback: CareStatus = "new"): CareStatus {
  return (STATUSES as string[]).includes(v) ? (v as CareStatus) : fallback;
}
function strOrNull(v: string): string | null {
  const t = v.trim();
  return t || null;
}

export interface CareItemInput {
  title: string;
  stickId: string | null;
  assignedTo: string | null;
  priority: CarePriority;
  status: CareStatus;
  description: string;
  category: string;
  nextAction: string;
  dueDate: string;
  signalId: string | null;
}
export type ValidatedCareItem =
  | { ok: true; data: CareItemInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseCareItemInput(fd: FormData): ValidatedCareItem {
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { ok: false, fieldErrors: { title: ["Descreva o cuidado (título)."] } };
  return {
    ok: true,
    data: {
      title,
      stickId: strOrNull(String(fd.get("stickId") ?? "")),
      assignedTo: strOrNull(String(fd.get("assignedTo") ?? "")),
      priority: priOr(String(fd.get("priority") ?? "")),
      status: statusOr(String(fd.get("status") ?? "")),
      description: String(fd.get("description") ?? "").trim(),
      category: String(fd.get("category") ?? "").trim(),
      nextAction: String(fd.get("nextAction") ?? "").trim(),
      dueDate: String(fd.get("dueDate") ?? ""),
      signalId: strOrNull(String(fd.get("signalId") ?? "")),
    },
  };
}

export interface NoteInput {
  content: string;
}
export function parseNoteInput(fd: FormData): { ok: true; data: NoteInput } | { ok: false; message: string } {
  const content = String(fd.get("content") ?? "").trim();
  if (!content) return { ok: false, message: "Escreva a nota." };
  return { ok: true, data: { content } };
}

export interface ContactInput {
  contactedOn: string;
  note: string;
  method: string;
  resolve: boolean;
}
export function parseContactInput(fd: FormData): { ok: true; data: ContactInput } | { ok: false; message: string } {
  const contactedOn = String(fd.get("contactedOn") ?? "");
  const note = String(fd.get("note") ?? "").trim();
  if (!contactedOn) return { ok: false, message: "Informe a data do contato." };
  if (!note) return { ok: false, message: "Descreva o que aconteceu." };
  return {
    ok: true,
    data: { contactedOn, note, method: String(fd.get("method") ?? "").trim(), resolve: String(fd.get("resolve") ?? "") === "on" },
  };
}
