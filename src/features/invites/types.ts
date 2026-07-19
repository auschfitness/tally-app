// Modelos de front dos convites de membro. Sem I/O: só as formas que a UI, o domínio
// puro e as Server Actions trocam. As linhas do banco (member_invites) são mapeadas para
// cá nas queries, já com o nome da pessoa (sticks.full_name) e o status efetivo resolvido.
import type { InviteStatus } from "./domain";

export type { InviteStatus } from "./domain";
export type { StickAccountState } from "./domain";

// Um convite para a tela de gestão (/members).
export interface InviteView {
  id: string;
  stickId: string;
  personName: string; // sticks.full_name, resolvido na query
  email: string;
  token: string; // o link é montado no cliente (origin + /convite/token)
  status: InviteStatus; // status EFETIVO (pending vencido → expired)
  rawStatus: string; // o que está gravado na coluna (para depuração/histórico)
  expiresAt: string; // ISO
  acceptedAt: string | null; // ISO ou null
  createdAt: string; // ISO
}
