import { requireOrg } from "@/lib/auth/session";
import { signals } from "@/features/signals/domain";
import { loadHomeData } from "@/features/home/queries";
import {
  riskDist,
  flaggedPeople,
  weeklyAttendance,
  communityInsights,
  homeVisibleSignals,
  celebrations,
  todayCounts,
} from "@/features/home/domain";
import { HomeView } from "@/features/home/components/HomeView";

// Home / Pulse (Server Component) — a última tela migrada. AGREGAÇÃO pura: reusa o
// assembler do Inbox + orações/estudo/jornada e projeta o topo. `now` injetado no
// engine (determinístico). Ver docs/handoffs/home-supabase.md.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { supabase, orgId, user } = await requireOrg();
  const sp = await searchParams;

  const campusRes = await supabase.from("campuses").select("name").eq("org_id", orgId).order("name");
  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";

  const now = new Date();
  const data = await loadHomeData(supabase, orgId, activeCampus, now);
  const all = signals(data.input, now);
  const visible = homeVisibleSignals(all, data.overrides);

  return (
    <HomeView
      greetingName={user.email?.split("@")[0] ?? ""}
      activeCampus={activeCampus}
      today={todayCounts(visible, data.input.groupsHealth, data.input.people, activeCampus, data.prayersAnswered)}
      risk={riskDist(data.input.people, activeCampus)}
      attendance={weeklyAttendance(data.input.sessions, now, 8)}
      flagged={flaggedPeople(data.input.people, activeCampus)}
      groups={data.input.groupsHealth}
      community={communityInsights(data.input.people, data.input.groupsHealth, data.movement30, activeCampus)}
      celebrations={celebrations(visible)}
      study={data.study}
    />
  );
}
