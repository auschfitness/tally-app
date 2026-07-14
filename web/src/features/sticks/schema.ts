// Validação tipada da entrada de pessoa (fronteira de Server Action). Sem lib
// externa — as regras são simples e explícitas. Retorna erros por campo.
import { RELATIONSHIPS, type Relationship } from "./domain";
import type { PersonInput } from "./types";

export type Validated =
  | { ok: true; data: PersonInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

function bool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

export function parsePersonInput(formData: FormData): Validated {
  const fieldErrors: Record<string, string[]> = {};

  const name = String(formData.get("name") ?? "").trim();
  if (!name) fieldErrors.name = ["Informe o nome."];

  const relRaw = String(formData.get("relationship") ?? "member");
  const relationship: Relationship = (RELATIONSHIPS as string[]).includes(relRaw)
    ? (relRaw as Relationship)
    : "member";

  const campus = String(formData.get("campus") ?? "").trim();
  const group = String(formData.get("group") ?? "").trim();
  const lastSeen = String(formData.get("lastSeen") ?? "").trim();
  if (lastSeen && !/^\d{4}-\d{2}-\d{2}$/.test(lastSeen)) {
    fieldErrors.lastSeen = ["Data inválida."];
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      name,
      relationship,
      isLeader: bool(formData.get("isLeader")),
      campus,
      group,
      lastSeen,
      followup: bool(formData.get("followup")),
    },
  };
}
