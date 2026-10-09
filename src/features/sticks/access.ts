// Quem pode editar fichas: espelha can_edit_people() do banco (m66). O RLS continua sendo a barreira.
import { can, type OrgContext } from "@/lib/auth/session";

export function canEditPeople(ctx: OrgContext): boolean {
  return can(ctx, "members.manage") || can(ctx, "sticks.edit");
}
