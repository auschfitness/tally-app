import { requireOrg, can } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { listSticks, listGroupNames } from "@/features/sticks/queries";
import { pendingInviteStickIds } from "@/features/invites/queries";
import { SticksBoard } from "@/features/sticks/components/SticksBoard";

type RelFilter = "" | "visitor" | "member" | "leader" | "inactive";
type CareFilter = "" | "em" | "at" | "ri";

const REL_VALUES = new Set(["visitor", "member", "leader", "inactive"]);
const CARE_VALUES = new Set(["em", "at", "ri"]);

// Página de Sticks (Server Component): busca no servidor (RLS por org), filtra o
// campus ativo, e entrega ao board interativo. Mutações via Server Actions.
export default async function SticksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rel?: string; care?: string; campus?: string }>;
}) {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  const canManageMembers = can(ctx, "members.manage");
  const sp = await searchParams;

  const [people, groups, campusRes, pendingIds] = await Promise.all([
    listSticks(supabase, orgId),
    listGroupNames(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
    canManageMembers ? pendingInviteStickIds(supabase, orgId, new Date().toISOString()) : Promise.resolve([]),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);
  const campusPeople = people.filter((p) => p.campus === activeCampus);

  const initial = {
    q: sp.q ?? "",
    rel: (sp.rel && REL_VALUES.has(sp.rel) ? sp.rel : "") as RelFilter,
    care: (sp.care && CARE_VALUES.has(sp.care) ? sp.care : "") as CareFilter,
  };

  return (
    <SticksBoard
      people={campusPeople}
      groups={groups}
      campuses={campuses}
      activeCampus={activeCampus}
      canManageMembers={canManageMembers}
      pendingInviteStickIds={pendingIds}
      initial={initial}
    />
  );
}
