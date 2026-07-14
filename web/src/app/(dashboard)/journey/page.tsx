import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { loadJourneyData } from "@/features/journey/queries";
import { journeyStats, journeyFunnel, journeyMovement, firstVisitDrop } from "@/features/journey/domain";
import { JourneyBoard } from "@/features/journey/components/JourneyBoard";

// Journey Map (Server Component, read-only): analytics puras computadas no servidor
// a partir de dados relacionais reais. Só o foco de estágio é interativo (cliente).
export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [people, data, campusRes] = await Promise.all([
    listSticks(supabase, orgId),
    loadJourneyData(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";
  const campusPeople = people.filter((p) => p.campus === activeCampus);

  const now = new Date();
  const stats = journeyStats(campusPeople, data.enteredAtByStick, now);
  const funnel = journeyFunnel(stats);
  const movement = journeyMovement(data.movementOccurredAts, 6, now);

  // firstVisitDrop escopado às pessoas do campus ativo.
  const campusIds = new Set(campusPeople.map((p) => p.id));
  const scopedMilestones = new Map<string, Set<string>>();
  for (const [stickId, codes] of data.milestoneCodesByStick) {
    if (campusIds.has(stickId)) scopedMilestones.set(stickId, codes);
  }
  const firstVisit = firstVisitDrop(scopedMilestones);

  return <JourneyBoard stats={stats} funnel={funnel} movement={movement} firstVisit={firstVisit} />;
}
