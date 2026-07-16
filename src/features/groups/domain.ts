// Domínio Saúde dos Grupos. Health portado 1:1 de derived.js (groupsHealth).
// Depende do domínio de Sticks (careReasons) — interface limpa entre features.
import { careReasons } from "@/features/sticks/domain";
import type { Person } from "@/features/sticks/types";

export type Band = "healthy" | "attention" | "risk";

export interface Group {
  id: string;
  name: string;
  campus: string;
  leader: string;
  day: string;
  time: string;
  newMembers: number;
  leftRecently: number;
}

export interface GroupHealth {
  id: string;
  name: string;
  leader: string;
  count: number;
  acc: number;
  rate: number;
  band: Band;
  newMembers: number;
  leftRecently: number;
  noLeader: boolean;
}

export function bandOf(count: number, rate: number): Band {
  if (count === 0) return "attention";
  return rate >= 85 ? "healthy" : rate >= 70 ? "attention" : "risk";
}

// Saúde de cada grupo do campus ativo: membros, "em dia" (sem motivos de care),
// taxa e faixa. Ordena da menor taxa para a maior (o que precisa de atenção primeiro).
export function groupsHealth(people: Person[], groups: Group[], activeCampus: string): GroupHealth[] {
  return groups
    .filter((g) => g.campus === activeCampus || !g.campus)
    .map((g) => {
      const members = people.filter((p) => p.group === g.name && p.campus === activeCampus);
      const acc = members.filter((p) => careReasons(p).length === 0).length;
      const rate = members.length ? Math.round((acc / members.length) * 100) : 0;
      return {
        id: g.id,
        name: g.name,
        leader: g.leader,
        count: members.length,
        acc,
        rate,
        band: bandOf(members.length, rate),
        newMembers: g.newMembers,
        leftRecently: g.leftRecently,
        noLeader: !g.leader,
      };
    })
    .sort((a, b) => a.rate - b.rate);
}
