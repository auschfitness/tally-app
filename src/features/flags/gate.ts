// Trava de maturidade no SERVIDOR (síncrona — NÃO "use server"). As flags ligadas da org
// já vêm resolvidas no OrgContext (uma única RPC `org_flags` por request, em session.ts):
// a precedência (override por org > rollout global) mora no banco, aqui é só pertinência.
// Gate de produto, NÃO de segurança — a RLS é a barreira real.
import type { OrgContext } from "@/lib/auth/session";
import type { FlagKey } from "./catalog";

// `Pick` em vez de `OrgContext` inteiro: aceita o contexto real (estrutural) e deixa a
// função testável sem forjar um cliente Supabase.
export function flagOn(ctx: Pick<OrgContext, "flags">, key: FlagKey): boolean {
  return ctx.flags.includes(key);
}
