// Domínio puro do Inbox — filtro por status/categoria e ordenação por nível.
// Portado de src/views/inbox.js (chips, rank, filtros) + src/core/derived.js
// (sigStatus/activeSignals). Sem I/O. O cálculo dos Signals é do engine.
import type { Signal, SignalLevel } from "@/features/signals/domain";
import type { CategoryDef, InboxStatus, OverridesMap } from "./types";

// Categorias do filtro (mesma ordem/rótulos do legado; "Journey" aparece como
// "Pessoas" e "Teams" como "Serviço").
export const CATEGORIES: CategoryDef[] = [
  { key: "all", label: "Todos" },
  { key: "Care", label: "Care" },
  { key: "Journey", label: "Pessoas" },
  { key: "Groups", label: "Grupos" },
  { key: "Teams", label: "Serviço" },
  { key: "Services", label: "Cultos" },
  { key: "Celebration", label: "Celebrações" },
];

// Rótulo PT-BR da origem de um sinal (reusa os rótulos dos chips para o item e o
// filtro direm a MESMA palavra). Sem isto, o feed mostrava o enum cru em inglês
// ("Teams"/"Groups"). Fallback = a própria categoria.
const CATEGORY_LABEL = new Map(CATEGORIES.filter((c) => c.key !== "all").map((c) => [c.key, c.label]));
export function categoryLabel(category: string): string {
  return CATEGORY_LABEL.get(category) ?? category;
}

// Urgência de exibição (0 = mais alto). Preserva o rank do legado.
export const LEVEL_RANK: Record<SignalLevel, number> = { attention: 0, notice: 1, celebration: 2 };

// Status que somem do feed (Adiar/atribuído-a-Care/Dispensado). new e seen ficam.
const HIDDEN: ReadonlySet<InboxStatus> = new Set<InboxStatus>(["snoozed", "assigned", "dismissed"]);

export function statusOf(overrides: OverridesMap, key: string): InboxStatus {
  return overrides.get(key) ?? "new";
}

// Signals visíveis no feed: fora os ocultos por status. Ordena por nível.
export function visibleSignals(all: Signal[], overrides: OverridesMap): Signal[] {
  return all
    .filter((s) => !HIDDEN.has(statusOf(overrides, s.key)))
    .slice()
    .sort((a, b) => (LEVEL_RANK[a.level] ?? 0) - (LEVEL_RANK[b.level] ?? 0));
}

// Feed final: visíveis + filtro de categoria ("all" = tudo). Estável (sort já é
// aplicado em visibleSignals; filtrar não reordena).
export function feedFor(all: Signal[], overrides: OverridesMap, category: string): Signal[] {
  const vis = visibleSignals(all, overrides);
  return category === "all" ? vis : vis.filter((s) => s.category === category);
}

// Contagem por categoria (para badges/telemetria) — só dos visíveis.
export function countByCategory(all: Signal[], overrides: OverridesMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of visibleSignals(all, overrides)) out[s.category] = (out[s.category] ?? 0) + 1;
  return out;
}

// Cor do nível (avatar/realce) — usada pela UI. Mantida no domínio p/ um só lugar.
export function levelColor(level: SignalLevel): { fg: string; bg: string } {
  if (level === "celebration") return { fg: "#8b74e8", bg: "rgba(139,116,232,.16)" };
  if (level === "attention") return { fg: "var(--coral)", bg: "rgba(234,91,76,.16)" };
  return { fg: "var(--blue)", bg: "rgba(43,92,230,.13)" };
}
