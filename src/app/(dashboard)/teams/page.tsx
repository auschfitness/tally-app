import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { loadTeamsData } from "@/features/teams/queries";
import { TeamsBoard } from "@/features/teams/components/TeamsBoard";

// Serviço — Times & Ministérios (Server Component). Lista ministérios/times a
// partir das tabelas relacionais; mutações via Server Actions.
export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [data, people, campusRes] = await Promise.all([
    loadTeamsData(supabase, orgId),
    listSticks(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";
  const options = people.filter((p) => p.campus === activeCampus).map((p) => ({ id: p.id, name: p.name }));

  return (
    <TeamsBoard
      ministries={data.ministries}
      teams={data.teams}
      members={data.members}
      nameByStick={Object.fromEntries(data.nameByStick)}
      people={options}
      campuses={campuses}
      activeCampus={activeCampus}
    />
  );
}
