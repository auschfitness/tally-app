import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { listSticks } from "@/features/sticks/queries";
import { loadTeamsData } from "@/features/teams/queries";
import { barPct, ministryStats } from "@/features/teams/domain";
import { EditMinistryButton } from "@/features/teams/components/EditButtons";
import type { TeamMember } from "@/features/teams/types";

// Painel do ministério (Server Component): consciência operacional — times,
// pessoas únicas servindo, times sem líder e distribuição por time. Sem score.
export default async function MinistryDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campus?: string }>;
}) {
  const { id } = await params;
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [data, people, campusRes] = await Promise.all([
    loadTeamsData(supabase, orgId),
    listSticks(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
  ]);

  const ministry = data.ministries.find((m) => m.id === id);
  if (!ministry) notFound();

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);
  const options = people.filter((p) => p.campus === activeCampus).map((p) => ({ id: p.id, name: p.name }));
  const nameByStick = data.nameByStick;

  const membersByTeam = new Map<string, TeamMember[]>();
  for (const m of data.members) (membersByTeam.get(m.team_id) ?? membersByTeam.set(m.team_id, []).get(m.team_id)!).push(m);

  const stats = ministryStats(ministry, data.teams, membersByTeam);

  return (
    <>
      <Link href="/teams" className="link">← Voltar aos times</Link>
      <div style={{ display: "flex", alignItems: "flex-start", margin: "10px 0 18px" }}>
        <div>
          <h1 className="page">{ministry.name}</h1>
          <p className="sub" style={{ margin: 0 }}>{ministry.description || "Ministério"}</p>
        </div>
        <EditMinistryButton ministry={ministry} people={options} activeCampus={activeCampus} />
      </div>

      <div className="panel" style={{ marginBottom: 16, display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
        <div className="mi-k">{ministry.name}</div>
        <div><b style={{ color: "var(--blue)", fontSize: 16 }}>{stats.teamCount}</b> <span className="muted">time{stats.teamCount !== 1 ? "s" : ""}</span></div>
        <div><b style={{ color: "var(--green)", fontSize: 16 }}>{stats.peopleServing}</b> <span className="muted">servindo</span></div>
        <div><b style={{ color: "#E8833A", fontSize: 16 }}>{stats.noLeader}</b> <span className="muted">sem líder</span></div>
        {ministry.leader_id ? <div><span className="muted">Líder do ministério:</span> <b>{nameByStick.get(ministry.leader_id) ?? "—"}</b></div> : null}
      </div>

      <div className="panel">
        <div className="ph"><h3>Distribuição de serviço</h3><span className="muted" style={{ marginLeft: "auto" }}>por time</span></div>
        {stats.distribution.length === 0 ? (
          <div className="empty">Sem times neste ministério ainda. Crie um em “+ Novo time”.</div>
        ) : (
          stats.distribution.map((c) => (
            <Link key={c.team.id} href={`/teams/${c.team.id}`} className="li" style={{ padding: "8px 0" }}>
              <div style={{ flex: 1 }}>
                <div>
                  <b>{c.team.name}</b> <span className="muted">· {c.count} servindo</span>
                  {c.team.leader_id ? null : <span className="hb attention" style={{ marginLeft: 6 }}>sem líder</span>}
                </div>
                <div className="gbar" style={{ marginTop: 4 }}><i className="healthy" style={{ width: `${barPct(c.count, stats.maxCount)}%` }} /></div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
