import type { Relationship } from "./domain";

// View model de uma Stick para a UI (campos próprios da tabela `sticks` +
// grupo resolvido de group_members). Sub-campos ainda no app_state legado
// (milestones, household) entram quando aquelas features migrarem — ver
// docs/migration-matrix.md §D2.
export interface Person {
  id: string;
  name: string;
  relationship: Relationship;
  isLeader: boolean;
  campus: string;
  lastSeen: string | null;
  followup: boolean;
  firstVisit: string | null;
  source: string | null;
  birthDate: string | null;
  journeyStage: string;
  group: string;
  email: string | null; // e-mail da pessoa (para convidar ao app); nulo = sem e-mail
  userId: string | null; // conta ligada (auth.users) via sticks.user_id; nulo = ficha sem login
}

// Entrada validada de formulário (o que a UI pode enviar). O servidor deriva o
// resto (org, campus_id, journey stage) — nunca confia no navegador.
export interface PersonInput {
  name: string;
  relationship: Relationship;
  isLeader: boolean;
  campus: string;
  group: string;
  lastSeen: string;
  followup: boolean;
  email: string; // "" = sem e-mail
}
