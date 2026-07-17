import Link from "next/link";
import { requireOrg } from "@/lib/auth/session";
import { resolveActiveCampus } from "@/lib/campus";
import { listSticks } from "@/features/sticks/queries";
import { loadTeamsData } from "@/features/teams/queries";
import { WD, addDays, ddmm, weekStart } from "@/features/teams/domain";
import { AssignButton, AssignmentControls } from "@/features/teams/components/ScheduleClient";
import { readAccount } from "@/features/settings/domain";
import { initials, isoDate, zonedTodayIso } from "@/lib/utils/date";
import type { ScheduleAssignment } from "@/features/teams/types";

// Board de Escala (Server Component): semana com avatares. Serviço/Evento → Time →
// Papel → Stick numa data, com status. Navegação por ?anchor= (semana renderizada
// no servidor); escalar/status/remover via Server Actions nas folhas (client).
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ anchor?: string; campus?: string }>;
}) {
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [data, people, campusRes, stateRes] = await Promise.all([
    loadTeamsData(supabase, orgId),
    listSticks(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
    supabase.from("app_state").select("data").eq("org_id", orgId).maybeSingle(),
  ]);

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = await resolveActiveCampus(campuses, sp.campus);
  const options = people.filter((p) => p.campus === activeCampus).map((p) => ({ id: p.id, name: p.name }));
  const nameByStick = data.nameByStick;
  const teamName = new Map(data.teams.map((t) => [t.id, t.name]));

  // "Hoje" no fuso da organização (não no do servidor). O app roda SSR na Vercel em
  // UTC — usar a data do servidor destaca o dia errado (off-by-one) à noite no
  // Brasil/EUA. O fuso vem de app_state.account (Configurações). Sem âncora, a semana
  // padrão parte desse "hoje" corrigido.
  const tz = readAccount(stateRes.data?.data).timezone;
  const todayIso = zonedTodayIso(tz);
  const ws = weekStart(sp.anchor ?? todayIso);
  const prev = isoDate(addDays(ws, -7));
  const next = isoDate(addDays(ws, 7));
  const wkLabel = ddmm(ws) + " – " + ddmm(addDays(ws, 6));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    const di = isoDate(d);
    const items = data.schedule.filter((a) => a.assignment_date === di);
    const byTeam = new Map<string, ScheduleAssignment[]>();
    for (const a of items) {
      const k = a.team_id ?? "__none__";
      (byTeam.get(k) ?? byTeam.set(k, []).get(k)!).push(a);
    }
    return { d, di, byTeam };
  });

  return (
    <>
      <Link href="/teams" className="link">← Voltar aos times</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 16px" }}>
        <div>
          <h1 className="page">Escala</h1>
          <p className="sub" style={{ margin: 0 }}>Quem serve em cada data. Confirme, recuse ou peça cobertura.</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Link className="btn ghost sm" href={`/teams/schedule?anchor=${prev}`}>‹</Link>
          <b>{wkLabel}</b>
          <Link className="btn ghost sm" href={`/teams/schedule?anchor=${next}`}>›</Link>
          <Link className="btn ghost sm" href={`/teams/schedule?anchor=${todayIso}`}>Hoje</Link>
        </div>
        <AssignButton date={todayIso} teams={data.teams} people={options} variant="btn" label="+ Escalar" />
      </div>

      {days.map(({ d, di, byTeam }) => (
        <div key={di} className="panel" style={{ marginBottom: 10, ...(di === todayIso ? { outline: "2px solid var(--blue)" } : {}) }}>
          <div className="ph" style={{ marginBottom: 4 }}>
            <h3 style={{ fontSize: 14 }}>{WD[d.getDay()]} {ddmm(d)}</h3>
            <span style={{ marginLeft: "auto" }}><AssignButton date={di} teams={data.teams} people={options} /></span>
          </div>
          {byTeam.size === 0 ? (
            <div className="muted" style={{ padding: "4px 0" }}>—</div>
          ) : (
            [...byTeam.entries()].map(([tid, list]) => (
              <div key={tid} style={{ marginTop: 6 }}>
                <div className="mi-k" style={{ fontSize: 11 }}>{tid === "__none__" ? "Time removido" : teamName.get(tid) ?? "Time removido"}</div>
                {list.map((a) => {
                  const nm = (a.stick_id && nameByStick.get(a.stick_id)) || "—";
                  return (
                    <div className="li" key={a.id} style={{ padding: "5px 0" }}>
                      <div className="av" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(nm)}</div>
                      <div style={{ flex: 1 }}>
                        <div><b>{nm}</b>{a.role ? <span className="muted"> · {a.role}</span> : null}</div>
                      </div>
                      <AssignmentControls id={a.id} status={a.status} />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ))}
    </>
  );
}
