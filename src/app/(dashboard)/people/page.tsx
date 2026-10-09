import { requireOrg } from "@/lib/auth/session";
import { canEditPeople } from "@/features/sticks/access";
import { parseFilters } from "@/features/sticks/domain";
import { listPeople } from "@/features/sticks/queries";
import { PeopleBrowser } from "@/features/sticks/components/PeopleBrowser";

// Pessoas (Server Component): busca no servidor (RLS: equipe lê), filtros na querystring.
export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireOrg();
  const [sp, { people, groups }] = await Promise.all([searchParams, listPeople(ctx.supabase, ctx.orgId)]);
  return <PeopleBrowser people={people} groups={groups} initial={parseFilters(sp)} canEdit={canEditPeople(ctx)} />;
}
