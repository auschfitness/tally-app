import { requireOrg } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { listSticks } from "@/features/sticks/queries";
import { listGroups } from "@/features/groups/queries";
import { GroupsBoard } from "@/features/groups/components/GroupsBoard";

// Saúde dos Grupos (Server Component): saúde derivada de Sticks (careReasons) +
// group_members. Mutações via Server Actions.
export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [people, groups, campusRes] = await Promise.all([
    listSticks(supabase, orgId),
    listGroups(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);

  return <GroupsBoard people={people} groups={groups} activeCampus={activeCampus} campuses={campuses} />;
}
