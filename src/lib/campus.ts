// Contexto de campus ativo (SSR). O campus ativo é global e persiste no cookie
// `tally_campus`, setado pelo seletor do topo (CampusSwitcher). As telas resolvem o
// campus por aqui, sempre validando contra a lista de campi ATIVOS que receberam —
// nunca confiam num valor solto do navegador.
import { cookies } from "next/headers";

export const CAMPUS_COOKIE = "tally_campus";

// Prioridade: override explícito por URL (?campus=, p/ deep-links) > cookie (seletor
// do topo) > primeiro campus da lista. `campuses` deve conter só campi ativos.
export async function resolveActiveCampus(campuses: string[], override?: string): Promise<string> {
  if (override && campuses.includes(override)) return override;
  const cookieVal = (await cookies()).get(CAMPUS_COOKIE)?.value;
  if (cookieVal && campuses.includes(cookieVal)) return cookieVal;
  return campuses[0] ?? "";
}
