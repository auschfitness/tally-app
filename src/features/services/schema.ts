// Validação de entrada (fronteira do servidor). Espelha os formulários do legado.
import type { RecurringPattern } from "./types";

export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string[]> };

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

const PATTERNS = ["weekly", "monthly", "custom"] as const;

export interface ServiceInput {
  name: string;
  type: string;
  campus: string;
  weekday: number | null;
  recurring_pattern: RecurringPattern;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  active: boolean;
}
export function parseServiceInput(fd: FormData): Validated<ServiceInput> {
  const name = str(fd, "name");
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome ao culto."] } };
  const wdRaw = str(fd, "weekday");
  const wd = wdRaw === "" ? null : Number(wdRaw);
  const weekday = wd !== null && Number.isInteger(wd) && wd >= 0 && wd <= 6 ? wd : null;
  const pattern = str(fd, "recurring_pattern");
  return {
    ok: true,
    data: {
      name,
      type: str(fd, "type"),
      campus: str(fd, "campus"),
      weekday,
      recurring_pattern: (PATTERNS as readonly string[]).includes(pattern) ? (pattern as RecurringPattern) : "weekly",
      start_time: str(fd, "start_time"),
      end_time: str(fd, "end_time"),
      location: str(fd, "location"),
      description: str(fd, "description"),
      active: fd.get("active") != null,
    },
  };
}

export interface PlanItemInput {
  timeLabel: string;
  durationMin: number | null;
  title: string;
  responsible: string;
  notes: string;
}
export function parsePlanItemInput(fd: FormData): Validated<PlanItemInput> {
  const title = str(fd, "title");
  if (!title) return { ok: false, fieldErrors: { title: ["Dê um título ao item."] } };
  const durRaw = str(fd, "durationMin");
  const dur = durRaw === "" ? null : Number(durRaw);
  return {
    ok: true,
    data: {
      timeLabel: str(fd, "timeLabel"),
      durationMin: dur !== null && Number.isFinite(dur) ? Math.trunc(dur) : null,
      title,
      responsible: str(fd, "responsible"),
      notes: str(fd, "notes"),
    },
  };
}
