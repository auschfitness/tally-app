// Autorização de Giving/Doações (server-only, síncrono — NÃO "use server").
// Dado de doador é sensível (quem deu quanto): acesso SÓ por `finance.manage`
// (Tesoureiro/Dono). O RLS do banco (m30) é a barreira real — isto esconde a UI
// e dá erro claro para quem não pode. Ver docs/handoffs/giving-fase1.md.
import { can, type OrgContext } from "@/lib/auth/session";

export function canManageGiving(ctx: OrgContext): boolean {
  return can(ctx, "finance.manage");
}
