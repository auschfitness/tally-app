// Autorização de Comunicação (server-only, síncrono — NÃO "use server").
// Enviar mensagem para um público é ação sensível: acesso SÓ por
// `communication.send`. O RLS do banco é a barreira real — isto esconde a UI e dá
// erro claro para quem não pode (mesma pegada do Giving).
import { can, type OrgContext } from "@/lib/auth/session";

export function canSendCommunication(ctx: OrgContext): boolean {
  return can(ctx, "communication.send");
}
