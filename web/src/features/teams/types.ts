// Modelos de domínio da feature Serviço — Times & Ministérios. Team = onde a
// pessoa SERVE (≠ Group, onde ela pertence); Ministério agrupa Times. Espelham as
// tabelas relacionais (ministries/teams/team_members/schedule_assignments), com
// `campus` resolvido para NOME (campus_id é uuid na tabela). Ver
// docs/handoffs/teams-supabase.md.

export type TeamStatus = "active" | "inactive" | "archived";
export type MinistryStatus = "active" | "inactive" | "archived";
export type MemberStatus = "active" | "paused" | "inactive";
export type AssignmentStatus =
  | "assigned"
  | "confirmed"
  | "declined"
  | "replacement_needed"
  | "completed";
// Escada de desenvolvimento de liderança (Fase 6, §18) — caminho, nunca nota.
export type DevStage = "serving" | "apprentice" | "co_leader" | "leader";

export interface Ministry {
  id: string;
  name: string;
  description: string;
  campus: string;
  leader_id: string | null;
  color: string;
  status: MinistryStatus;
}

export interface Team {
  id: string;
  ministry_id: string | null;
  name: string;
  description: string;
  campus: string;
  leader_id: string | null;
  serving_roles: string[];
  status: TeamStatus;
}

export interface TeamMember {
  id: string;
  team_id: string;
  stick_id: string;
  role: string;
  status: MemberStatus;
  availability: string;
  joined_at: string;
  notes: string;
}

export interface ScheduleAssignment {
  id: string;
  service_id: string | null;
  event_id: string | null;
  team_id: string | null;
  role: string;
  stick_id: string | null;
  assignment_date: string;
  status: AssignmentStatus;
  confirmed_at: string | null;
}

// Estágio de liderança por membro (memberId → stage), fora de "leader" que vem de
// teams.leader_id. Persistido no sub-campo `leadershipDev` do blob app_state
// (não há coluna relacional; ver README e handoff).
export type LeadershipDev = Record<string, DevStage>;
