// Validação de entrada (fronteira do servidor). Schemas tipados e reutilizáveis;
// a validação do navegador melhora UX mas não substitui esta. Erros de campo
// estruturados. Espelha os formulários do legado (teams.js).
import { parseRoles } from "./domain";
import type { AssignmentStatus, MemberStatus, MinistryStatus, TeamStatus, DevStage } from "./types";

export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string[]> };

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

function oneOf<T extends string>(v: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const TEAM_STATUS = ["active", "inactive", "archived"] as const;
const MIN_STATUS = ["active", "inactive", "archived"] as const;
const MEMBER_STATUS = ["active", "paused", "inactive"] as const;
const ASG_STATUS = ["assigned", "confirmed", "declined", "replacement_needed", "completed"] as const;
const DEV_SETTABLE = ["serving", "apprentice", "co_leader"] as const;

export interface MinistryInput {
  name: string;
  description: string;
  leaderStickId: string;
  status: MinistryStatus;
  campus: string;
}
export function parseMinistryInput(fd: FormData): Validated<MinistryInput> {
  const name = str(fd, "name");
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome ao ministério."] } };
  return {
    ok: true,
    data: {
      name,
      description: str(fd, "description"),
      leaderStickId: str(fd, "leaderStickId"),
      status: oneOf(str(fd, "status"), MIN_STATUS, "active"),
      campus: str(fd, "campus"),
    },
  };
}

export interface TeamInput {
  name: string;
  ministryId: string;
  status: TeamStatus;
  description: string;
  servingRoles: string[];
  leaderStickId: string;
  campus: string;
}
export function parseTeamInput(fd: FormData): Validated<TeamInput> {
  const name = str(fd, "name");
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome ao time."] } };
  return {
    ok: true,
    data: {
      name,
      ministryId: str(fd, "ministryId"),
      status: oneOf(str(fd, "status"), TEAM_STATUS, "active"),
      description: str(fd, "description"),
      servingRoles: parseRoles(str(fd, "servingRoles")),
      leaderStickId: str(fd, "leaderStickId"),
      campus: str(fd, "campus"),
    },
  };
}

export interface MemberRoleInput {
  memberId: string;
  role: string;
  status: MemberStatus;
  availability: string;
  devStage: DevStage;
}
export function parseMemberRoleInput(fd: FormData): Validated<MemberRoleInput> {
  const memberId = str(fd, "memberId");
  if (!memberId) return { ok: false, fieldErrors: { memberId: ["Membro inválido."] } };
  return {
    ok: true,
    data: {
      memberId,
      role: str(fd, "role"),
      status: oneOf(str(fd, "status"), MEMBER_STATUS, "active"),
      availability: str(fd, "availability"),
      devStage: oneOf(str(fd, "devStage"), DEV_SETTABLE, "serving"),
    },
  };
}

export interface AssignInput {
  teamId: string;
  stickId: string;
  role: string;
  date: string;
  status: AssignmentStatus;
}
export function parseAssignInput(fd: FormData): Validated<AssignInput> {
  const teamId = str(fd, "teamId");
  const stickId = str(fd, "stickId");
  const date = str(fd, "date");
  const fieldErrors: Record<string, string[]> = {};
  if (!teamId) fieldErrors.teamId = ["Escolha um time."];
  if (!stickId) fieldErrors.stickId = ["Escolha uma pessoa."];
  if (!date) fieldErrors.date = ["Escolha a data."];
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: { teamId, stickId, role: str(fd, "role"), date, status: oneOf(str(fd, "status"), ASG_STATUS, "assigned") },
  };
}
