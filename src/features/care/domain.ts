// Domínio puro de Care — rótulos, faixas e regras de exibição/ordenação. Sem I/O.
// Prioridade/estado são os enums reais do banco (signal_priority / care_status).
import type { CareItem, CarePriority, CareStatus } from "./types";

export const PRIORITY_LBL: Record<CarePriority, string> = {
  celebration: "Celebração",
  notice: "Aviso",
  attention: "Atenção",
  urgent: "Urgente",
};
export const PRIORITY_BAND: Record<CarePriority, string> = {
  celebration: "healthy",
  notice: "attention",
  attention: "attention",
  urgent: "risk",
};
export const STATUS_LBL: Record<CareStatus, string> = {
  new: "Novo",
  assigned: "Atribuído",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const PRIORITIES: CarePriority[] = ["urgent", "attention", "notice", "celebration"];
export const OPEN_STATUSES: CareStatus[] = ["new", "assigned", "in_progress", "waiting"];

// Um item está EM ABERTO enquanto não for resolvido/fechado.
export function isOpen(status: CareStatus): boolean {
  return status !== "resolved" && status !== "closed";
}

// Urgência para ordenação (0 = mais urgente).
export function priorityRank(p: CarePriority): number {
  const i = PRIORITIES.indexOf(p);
  return i < 0 ? PRIORITIES.length : i;
}

// Ordena por urgência e, dentro dela, pelo prazo mais próximo (sem prazo ao fim).
export function sortCareItems(items: CareItem[]): CareItem[] {
  return items.slice().sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

// Contadores da faixa de resumo (ministrip): em aberto vs. resolvidos/fechados.
export interface CareSummary {
  open: number;
  resolved: number;
}
export function careSummary(items: CareItem[]): CareSummary {
  let open = 0;
  let resolved = 0;
  for (const it of items) {
    if (isOpen(it.status)) open += 1;
    else resolved += 1;
  }
  return { open, resolved };
}

// Separa abertos (ordenados) dos resolvidos — a UI mostra abertos em destaque.
export function splitCare(items: CareItem[]): { open: CareItem[]; resolved: CareItem[] } {
  return {
    open: sortCareItems(items.filter((it) => isOpen(it.status))),
    resolved: items.filter((it) => !isOpen(it.status)),
  };
}
