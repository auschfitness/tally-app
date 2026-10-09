// Tela de Pessoas no servidor: a lista da org, a ficha já escolhida (a da URL, ou a primeira da
// lista) e as permissões. `/people` e `/people/[id]` usam esta mesma tela.
import { notFound } from "next/navigation";
import { requireOrg, can } from "@/lib/auth/session";
import { canEditPeople } from "../access";
import { filterPeople, parseFilters } from "../domain";
import { getPerson, listPeople } from "../queries";
import { PeopleView } from "./PeopleView";

export async function PeopleScreen({ sp, forcedId }: { sp: Record<string, string | string[] | undefined>; forcedId?: string }) {
  const ctx = await requireOrg();
  const { people, groups } = await listPeople(ctx.supabase, ctx.orgId);
  const filters = parseFilters(sp);
  const asked = forcedId ?? (typeof sp.p === "string" ? sp.p : null);
  const found = Boolean(asked && people.some((p) => p.id === asked));
  if (forcedId && !found) notFound();
  const selected = found ? asked : filterPeople(people, filters, new Date())[0]?.id ?? null;
  const canFinance = can(ctx, "finance.manage");
  const detail = selected ? await getPerson(ctx.supabase, ctx.orgId, selected, canFinance) : null;

  return (
    <PeopleView
      people={people}
      groups={groups}
      initialFilters={filters}
      initialSelected={selected}
      initialDetail={detail}
      initialMobileOpen={found}
      canEdit={canEditPeople(ctx)}
      canDocs={can(ctx, "members.manage")}
      canFinance={canFinance}
    />
  );
}
