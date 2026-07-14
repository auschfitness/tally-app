import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { loadTeamsData } from "@/features/teams/queries";
import {
  DEV_LBL,
  TEAM_STATUS_LBL,
  barPct,
  leadershipLadder,
  roleDistribution,
  statusCounts,
  teamHealth,
  type HealthBand,
} from "@/features/teams/domain";
import { TeamMembersPanel } from "@/features/teams/components/TeamMembersPanel";
import { EditTeamButton } from "@/features/teams/components/EditButtons";
import { today } from "@/lib/utils/date";
import type { DevStage } from "@/features/teams/types";
import styles from "@/features/teams/teams.module.css";

const DOT: Record<HealthBand, string> = { risk: "#EA5B4C", attention: "#E8833A", healthy: "#1FA97A", muted: "var(--text-2)" };
const LADDER: DevStage[] = ["serving", "apprentice", "co_leader", "leader"];

export default async function TeamDetailPage({
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
    supabase.from("campuses").select("name").eq("org_id", orgId).order("name"),
  ]);

  const team = data.teams.find((t) => t.id === id);
  if (!team) notFound();

  const ministry = team.ministry_id ? data.ministries.find((m) => m.id === team.ministry_id) ?? null : null;
  const members = data.members
    .filter((m) => m.team_id === id)
    .sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1));

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : campuses[0] ?? "";
  const campusOptions = people.filter((p) => p.campus === activeCampus).map((p) => ({ id: p.id, name: p.name }));

  const nameByStick = Object.fromEntries(data.nameByStick);
  const already = new Set(members.map((m) => m.stick_id));
  const availablePeople = campusOptions.filter((p) => !already.has(p.id));

  const health = teamHealth(team, members, data.schedule, today());
  const dist = roleDistribution(team, members);
  const maxRole = dist.reduce((a, d) => Math.max(a, d.count), 0);
  const counts = statusCounts(members);
  const ladder = leadershipLadder(members, team, data.leadershipDev, (sid) => nameByStick[sid] ?? "—");
  const leaderName = team.leader_id ? nameByStick[team.leader_id] ?? "" : "";
  const roleList = team.serving_roles ?? [];

  return (
    <>
      <Link href="/teams" className="link">← Voltar aos times</Link>
      <div style={{ display: "flex", alignItems: "flex-start", margin: "10px 0 18px" }}>
        <div>
          <h1 className="page">{team.name || "(sem nome)"}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {ministry ? <Link href={`/teams/ministry/${ministry.id}`} style={{ textDecoration: "underline" }}>{ministry.name}</Link> : null}
            {ministry ? " · " : ""}
            {team.campus ? team.campus + " · " : ""}
            {TEAM_STATUS_LBL[team.status] || team.status}
          </p>
        </div>
        <EditTeamButton team={team} ministries={data.ministries} people={campusOptions} campuses={campuses} activeCampus={activeCampus} />
      </div>

      <div className="row2">
        <TeamMembersPanel
          team={team}
          members={members}
          leadershipDev={data.leadershipDev}
          nameByStick={nameByStick}
          availablePeople={availablePeople}
        />
        <div className="panel">
          <div className="ph"><h3>Papéis de serviço</h3></div>
          {roleList.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {roleList.map((r) => <span key={r} className="chip" style={{ background: "rgba(43,92,230,.10)", color: "var(--blue)" }}>{r}</span>)}
            </div>
          ) : (
            <div className="muted">Sem papéis definidos. Defina em “Editar time” (ex.: Vocal, Guitarra, Mesa).</div>
          )}
          {team.description ? <div className="field" style={{ marginTop: 14 }}><label>Sobre</label><div>{team.description}</div></div> : null}
          <div className="field" style={{ marginTop: 14 }}><label>Líder</label><div>{leaderName ? leaderName : <span className="muted">Sem líder</span>}</div></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="ph"><h3>Distribuição de serviço</h3></div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 4 }}>
          <span><b style={{ color: "var(--green)" }}>{counts.active}</b> <span className="muted">servindo</span></span>
          <span><b style={{ color: "#E8833A" }}>{counts.paused}</b> <span className="muted">em pausa</span></span>
          <span><b className="muted">{counts.inactive}</b> <span className="muted">inativos</span></span>
        </div>
        <div style={{ marginTop: 12 }}>
          {dist.length ? (
            dist.map((d) => (
              <div key={d.role} className="li" style={{ display: "block", padding: "6px 0" }}>
                <div><b>{d.role}</b> <span className="muted">· {d.count}{d.count === 0 ? " (ninguém ainda)" : ""}</span></div>
                <div className="gbar" style={{ marginTop: 4 }}><i className={d.count === 0 ? "attention" : "healthy"} style={{ width: `${barPct(d.count, maxRole)}%` }} /></div>
              </div>
            ))
          ) : (
            <div className="empty">Sem papéis para distribuir ainda.</div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="ph"><h3>Saúde do time</h3><span className="muted" style={{ marginLeft: "auto" }}>consciência operacional, não nota</span></div>
        {health.map((o, i) => (
          <div className="li" key={i} style={{ alignItems: "center" }}>
            <span className={styles.dot} style={{ background: DOT[o.band] }} />
            <div style={{ flex: 1 }}>{o.text}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="ph" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Desenvolvimento de liderança</h3><span className="muted" style={{ marginLeft: "auto" }}>um caminho de crescimento, não uma nota</span></div>
        <div className={styles.ladder}>
          {LADDER.map((s) => (
            <div className="panel" key={s} style={{ margin: 0 }}>
              <div className="ph" style={{ marginBottom: 6 }}><h3 style={{ fontSize: 13 }}>{DEV_LBL[s]}</h3><span className="muted" style={{ marginLeft: "auto" }}>{ladder[s].length}</span></div>
              {ladder[s].length ? (
                ladder[s].map((n, i) => (
                  <div className="li" key={i} style={{ padding: "4px 0" }}>
                    <div className="av" style={{ width: 26, height: 26, fontSize: 10 }}>{n.split(" ").map((x) => x[0] ?? "").slice(0, 2).join("").toUpperCase()}</div>
                    <div style={{ flex: 1 }}><b>{n}</b></div>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>—</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
