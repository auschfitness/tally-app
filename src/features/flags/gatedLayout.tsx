// Fábrica de layout com trava de flag. O dir de rota de um módulo em obra exporta
// `export default makeGatedLayout("<flag>")`: com a flag desligada, a subárvore inteira
// (incluindo deep-link) responde 404.
//
// Diferença proposital para `plans/gatedLayout.tsx`: lá a resposta é o Upsell (a feature
// existe e vende), aqui é `notFound()` — feature em obra NÃO EXISTE para o usuário, não
// há nada a oferecer. Gate de produto, não de segurança (a RLS é a barreira real).
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { flagOn } from "./gate";
import type { FlagKey } from "./catalog";

export function makeGatedLayout(flag: FlagKey) {
  return async function FlaggedLayout({ children }: { children: React.ReactNode }) {
    const ctx = await requireOrg();
    if (!flagOn(ctx, flag)) notFound();
    return <>{children}</>;
  };
}
