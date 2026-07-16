// Estado inicial do `app_state` para uma org nova, criado no onboarding via a RPC
// create_org. Espelha o blankState() do app legado para manter compatibilidade
// com a versão JS enquanto as duas coexistem (o blob some por feature à medida
// que a migração relacional avança — ver docs/migration-matrix.md §D2).
import type { Json } from "@/lib/database.types";

export function initialAppState(orgName: string, campusName: string, currency: string): Json {
  return {
    view: "dashboard",
    activeCampus: campusName,
    careWeeks: 3,
    institution: {
      name: orgName,
      currency,
      campuses: [campusName],
      funds: ["Geral", "Missões", "Construção", "Social"],
      catIn: ["Dízimo", "Oferta", "Doação", "Campanha"],
      catOut: ["Aluguel", "Utilidades", "Salários", "Missões", "Ação social", "Eventos", "Manutenção"],
      multiInstitution: false,
      institutions: [orgName],
      activeInstitution: orgName,
    },
    account: { role: "owner", language: "pt", timezone: "America/Sao_Paulo" },
  } satisfies Record<string, Json>;
}
