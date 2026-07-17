// Validação na fronteira do servidor. O formulário manda os checkboxes como várias
// entradas "perm"; sanitizamos contra o catálogo (nunca gravar chave desconhecida).
import { sanitizePermissions } from "./domain";
import type { PermissionKey } from "./types";

export interface RoleInput {
  name: string;
  permissions: PermissionKey[];
}
export type ValidatedRole = { ok: true; data: RoleInput } | { ok: false; fieldErrors: Record<string, string[]> };

export function parseRoleInput(fd: FormData): ValidatedRole {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome ao cargo."] } };
  if (name.length > 40) return { ok: false, fieldErrors: { name: ["Use um nome mais curto (até 40 caracteres)."] } };
  return { ok: true, data: { name, permissions: sanitizePermissions(fd.getAll("perm").map(String)) } };
}
