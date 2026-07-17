// Autorização de Settings (server-only, NÃO é "use server" — funções síncronas).
// Quem pode editar dados jurídicos/fiscais: dono, pastor (org.manage) ou tesoureiro
// (finance.manage). Espelha o helper can_manage_org_fiscal do banco; o RLS é a
// barreira real, isto dá erro claro e esconde os controles p/ quem não pode.
import { can, type OrgContext } from "@/lib/auth/session";

export function canManageFiscal(ctx: OrgContext): boolean {
  return can(ctx, "org.manage") || can(ctx, "finance.manage");
}
