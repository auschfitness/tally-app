// Trava de plano no SERVIDOR (síncrona — NÃO "use server"). Espelha planAllows lendo o
// plano do contexto da org. IMPORTANTE: plano-gating é gate COMERCIAL, não fronteira de
// segurança — o isolamento entre igrejas e as permissões continuam impostos pela RLS. Isto
// só decide o que a UI mostra. Ver o spec de design.
import type { OrgContext } from "@/lib/auth/session";
import { planAllows, type FeatureKey } from "./catalog";

// A org tem este recurso no plano dela?
export function gateFeature(ctx: OrgContext, feature: FeatureKey): boolean {
  return planAllows(ctx.plan, feature);
}
