import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { listSticks } from "@/features/sticks/queries";
import { listAttendanceSessions } from "@/lib/attendance";
import {
  listPlanItems,
  listServiceAssignments,
  listServiceSermons,
  listServices,
} from "@/features/services/queries";
import { PATTERN_LBL, composition, trendBars, whenLabel } from "@/features/services/domain";
import { EditServiceButton, CheckinButton } from "@/features/services/components/ServiceTools";
import { PlanPanel } from "@/features/services/components/PlanPanel";
import { ageFrom, brDate } from "@/lib/utils/date";
import styles from "@/features/services/services.module.css";

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campus?: string }>;
}) {
  const { id } = await params;
  const { supabase, orgId } = await requireOrg();
  const sp = await searchParams;

  const [services, plan, sessions, sermons, assignments, people, campusRes] = await Promise.all([
    listServices(supabase, orgId),
    listPlanItems(supabase, orgId, id),
    listAttendanceSessions(supabase, orgId, "service", id),
    listServiceSermons(supabase, orgId, id),
    listServiceAssignments(supabase, orgId, id),
    listSticks(supabase, orgId),
    supabase.from("campuses").select("name").eq("org_id", orgId).eq("active", true).order("name"),
  ]);

  const service = services.find((s) => s.id === id);
  if (!service) notFound();

  const campuses = (campusRes.data ?? []).map((c) => c.name);
  const activeCampus = sp.campus && campuses.includes(sp.campus) ? sp.campus : service.campus || campuses[0] || "";
  const campusPeople = people.filter((p) => p.campus === activeCampus).map((p) => ({ id: p.id, name: p.name }));

  const personById = new Map(people.map((p) => [p.id, p]));
  const sessAsc = sessions.slice().reverse(); // sessions vêm recentes-primeiro
  const bars = trendBars(sessAsc.map((s) => ({ date: s.date, count: s.count })), 12);

  const latest = sessions[0];
  const comp = latest
    ? composition(
        latest.presentIds
          .map((sid) => personById.get(sid))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({ relationship: p.relationship, age: ageFrom(p.birthDate) })),
      )
    : null;

  return (
    <>
      <Link href="/services" className="link">← Voltar aos cultos</Link>
      <div style={{ display: "flex", alignItems: "flex-start", margin: "10px 0 18px" }}>
        <div>
          <h1 className="page">{service.name || "(sem nome)"}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {whenLabel(service)}{service.type ? ` · ${service.type}` : ""}{service.active ? "" : " · Inativo"}
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <EditServiceButton service={service} campuses={campuses} activeCampus={activeCampus} />
          <CheckinButton serviceId={service.id} campus={activeCampus} people={campusPeople} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        {sessions.length === 0 || !comp ? (
          <>
            <div className="ph"><h3>Presença</h3></div>
            <div className="empty">Sem ocorrências ainda. Registre a presença de um culto para ver a tendência.</div>
          </>
        ) : (
          <>
            <div className="ph"><h3>Presença</h3><span className="muted" style={{ marginLeft: "auto" }}>últimas {Math.min(12, sessions.length)} ocorrências</span></div>
            <div className={styles.trend}>
              {bars.map((b, i) => (
                <div className={styles.trendCol} key={i}>
                  <span className={`muted ${styles.trendCap}`}>{b.count}</span>
                  <div className={styles.trendBar} style={{ height: b.height }} title={brDate(b.date)} />
                  <span className={`muted ${styles.trendLbl}`}>{b.date ? brDate(b.date).slice(0, 5) : "—"}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 10 }}>
              <span><b style={{ color: "var(--blue)", fontSize: 16 }}>{comp.total}</b> <span className="muted">presentes (última)</span></span>
              <span><b>{comp.visitors}</b> <span className="muted">visitantes</span></span>
              <span><b>{comp.first}</b> <span className="muted">1ª vez</span></span>
              <span><b>{comp.returning}</b> <span className="muted">retornando</span></span>
              <span><b>{comp.kids}</b> <span className="muted">crianças</span></span>
            </div>
          </>
        )}
      </div>

      <div className="row2">
        <PlanPanel serviceId={service.id} items={plan} />
        <div className="panel">
          <div className="ph"><h3>Presenças recentes</h3><span className="muted" style={{ marginLeft: "auto" }}>{sessions.length} ocorrência{sessions.length !== 1 ? "s" : ""}</span></div>
          {sessions.length === 0 ? (
            <div className="empty">Nenhuma presença registrada neste culto ainda. Use “Registrar presença”.</div>
          ) : (
            sessions.slice(0, 8).map((x) => (
              <div className="li" key={x.id}>
                <div className="av">{x.date ? brDate(x.date).slice(0, 5) : "—"}</div>
                <div style={{ flex: 1 }}>
                  <div><b>{x.date ? brDate(x.date) : "sem data"}</b></div>
                  <div className="meta">{x.count} presente{x.count !== 1 ? "s" : ""}</div>
                </div>
              </div>
            ))
          )}
          <div className="ph" style={{ marginTop: 14 }}><h3>Sobre o culto</h3></div>
          <div className="field"><label>Quando</label><div>{whenLabel(service)} · {PATTERN_LBL[service.recurring_pattern] || service.recurring_pattern}</div></div>
          {service.location ? <div className="field"><label>Local</label><div>{service.location}</div></div> : null}
          {service.campus ? <div className="field"><label>Campus</label><div>{service.campus}</div></div> : null}
          {service.description ? <div className="field"><label>Sobre</label><div>{service.description}</div></div> : null}
        </div>
      </div>

      <div className="row2" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="ph"><h3>Ensino deste culto</h3><span className="muted" style={{ marginLeft: "auto" }}>{sermons.length} {sermons.length === 1 ? "sermão" : "sermões"}</span></div>
          {sermons.length === 0 ? (
            <div className="empty">Nenhum sermão vinculado a este culto. Vincule no editor do sermão (Propriedades → Culto).</div>
          ) : (
            sermons.map((x) => (
              <div className="li" key={x.id}>
                <div style={{ flex: 1 }}><b>{x.title || "(sem título)"}</b>{x.mainPassage ? <span className="muted"> · {x.mainPassage}</span> : null}</div>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div className="ph"><h3>Times escalados</h3></div>
          {assignments.length === 0 ? (
            <div className="empty">Nenhum time escalado para este culto ainda. A escala por time vive em Times › Escala.</div>
          ) : (
            assignments.map((a) => (
              <div className="li" key={a.id}>
                <div style={{ flex: 1 }}><b>{a.team}</b>{a.role ? <span className="muted"> · {a.role}</span> : null}{a.person ? <span className="muted"> · {a.person}</span> : null}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
