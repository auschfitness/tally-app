// Fábrica de layout com trava de plano. Cada dir de rota de um módulo Pro exporta
// `export default makeGatedLayout("<feature>")`: se o plano da igreja não libera o recurso,
// a subárvore inteira (incluindo deep-links) mostra o Upsell no lugar do módulo. Gate
// COMERCIAL (não de segurança — a RLS é a barreira real). Ver o spec de design.
import { requireOrg } from "@/lib/auth/session";
import { gateFeature } from "./gate";
import { Upsell } from "./components/Upsell";
import type { FeatureKey } from "./catalog";

export function makeGatedLayout(feature: FeatureKey) {
  return async function GatedLayout({ children }: { children: React.ReactNode }) {
    const ctx = await requireOrg();
    if (!gateFeature(ctx, feature)) return <Upsell feature={feature} />;
    return <>{children}</>;
  };
}
