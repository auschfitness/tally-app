// `<Flagged flag="x">` — esconde um TRECHO dentro de uma tela que já existe (a tela
// inteira usa makeGatedLayout). Server Component: a decisão é no servidor, o HTML do
// trecho nem chega ao navegador com a flag desligada.
//
// Sem ctx: resolve pelo `requireOrg()` da própria request. Em tela que já tem o contexto
// em mãos, passe-o (`ctx={ctx}`) e evite a ida extra ao banco.
import { requireOrg, type OrgContext } from "@/lib/auth/session";
import { flagOn } from "../gate";
import type { FlagKey } from "../catalog";

export async function Flagged({
  flag,
  ctx,
  children,
}: {
  flag: FlagKey;
  ctx?: Pick<OrgContext, "flags">;
  children: React.ReactNode;
}) {
  const resolved = ctx ?? (await requireOrg());
  if (!flagOn(resolved, flag)) return null;
  return <>{children}</>;
}
