// Autorização da Contabilidade (server-only, síncrono — NÃO "use server").
// Dado financeiro sensível: acesso SÓ por `finance.manage` (Tesoureiro/Dono). O RLS
// do banco (m48) é a barreira real; isto esconde a UI e dá erro claro a quem não pode.
import { can, type OrgContext } from "@/lib/auth/session";

export function canManageAccounting(ctx: OrgContext): boolean {
  return can(ctx, "finance.manage");
}
