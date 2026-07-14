// Validação da entrada de pedido de oração (fronteira de Server Action).
import { type Privacy } from "./domain";

const PRIV = new Set<Privacy>(["church", "group", "leader", "private"]);

export interface PrayerInput {
  title: string;
  author: string;
  request: string;
  privacy: Privacy;
  group: string;
  topics: string[];
}

export type Validated =
  | { ok: true; data: PrayerInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parsePrayerInput(formData: FormData): Validated {
  const fieldErrors: Record<string, string[]> = {};

  const request = String(formData.get("request") ?? "").trim();
  if (!request) fieldErrors.request = ["Escreva o pedido."];

  const privRaw = String(formData.get("privacy") ?? "church");
  const privacy: Privacy = PRIV.has(privRaw as Privacy) ? (privRaw as Privacy) : "church";

  const topics = String(formData.get("topics") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      title: String(formData.get("title") ?? "").trim(),
      author: String(formData.get("author") ?? "").trim() || "Anônimo",
      request,
      privacy,
      group: String(formData.get("group") ?? "").trim(),
      topics,
    },
  };
}
