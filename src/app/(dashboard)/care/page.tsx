import { requireOrg, can } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { loadCare, listCareMembers } from "@/features/care/queries";
import { CareBoard } from "@/features/care/components/CareBoard";

// Care (Server Component). ⚠️ RLS POR PERMISSÃO: sem `care.view` a pessoa não vê
// nada de Care (comportamento correto — Care é sensível). Tratamos isso com
// elegância aqui (não erro cru); a RLS do banco é a barreira real de qualquer forma.
// Ver docs/handoffs/care-supabase.md.
export default async function CarePage() {
  const ctx = await requireOrg();

  if (!can(ctx, "care.view")) {
    return (
      <>
        <h1 className="page">Care</h1>
        <p className="sub">Cuidado pastoral.</p>
        <div className="empty" style={{ marginTop: 16 }}>
          Você não tem acesso ao Care. Peça a um líder a permissão <b>care.view</b> para
          acompanhar o cuidado pastoral (é uma área sensível, restrita por padrão).
        </div>
      </>
    );
  }

  const { supabase, orgId } = ctx;
  const [items, members, people] = await Promise.all([
    loadCare(supabase, orgId),
    listCareMembers(supabase, orgId),
    listSticks(supabase, orgId),
  ]);

  // Pessoa cuidada pode ser qualquer Stick ativa da org (Care é org-wide, não
  // filtrado por campus — diferente do legado, que filtrava a LISTA por campus).
  const sticks = people.map((p) => ({ id: p.id, name: p.name }));

  return <CareBoard items={items} members={members} sticks={sticks} canManage={can(ctx, "care.manage")} />;
}
