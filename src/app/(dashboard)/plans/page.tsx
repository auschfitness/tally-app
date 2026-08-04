import { requireOrg } from "@/lib/auth/session";
import { PLANS } from "@/features/plans/catalog";
import { PlansComparison } from "@/features/plans/components/PlansComparison";

// Planos (Server Component) — vitrine: o plano atual da igreja + comparação dos planos.
// Visível a qualquer membro (é marketing/comparação). A troca de verdade é no /admin (até
// existir cobrança). Ver docs/superpowers/specs/2026-08-01-planos-feature-gating-design.md.
export default async function PlansPage() {
  const { plan } = await requireOrg();

  return (
    <>
      <h1 className="page">Planos</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        Sua igreja está no plano <strong>{PLANS[plan].name}</strong>. Veja o que cada plano oferece.
      </p>
      <PlansComparison currentPlan={plan} />
    </>
  );
}
