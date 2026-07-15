// Home / Pulse (Server Component). Agrega e ORDENA o topo do que as features já
// retornam — sem lógica de banco nova. Quase tudo é leitura; as ações moram nas
// features (Care/Inbox/Groups). Painéis de Estudo e "Para celebrar" somem inteiros
// quando não há dado (evita seção vazia), como no legado.
import Link from "next/link";
import { ConicDonut } from "@/components/shared/ConicDonut";
import { initials, agoLabel, brDate } from "@/lib/utils/date";
import { isVisitor } from "@/features/sticks/domain";
import type { GroupHealth } from "@/features/groups/domain";
import type { Signal } from "@/features/signals/domain";
import { RISK_COLOR, type CommunityInsights, type FlaggedPerson, type RiskDist, type TodayCounts, type WeekPoint } from "../domain";
import type { StudySurface } from "../queries";
import { FrequencyChart } from "./FrequencyChart";
import styles from "../home.module.css";

const SERMON_STATUS_LBL: Record<string, string> = { draft: "Rascunho", preparing: "Preparando", ready: "Pronto", preached: "Pregado", archived: "Arquivado" };

export function HomeView({
  greetingName,
  activeCampus,
  today,
  risk,
  attendance,
  flagged,
  groups,
  community,
  celebrations,
  study,
}: {
  greetingName: string;
  activeCampus: string;
  today: TodayCounts;
  risk: RiskDist;
  attendance: WeekPoint[];
  flagged: FlaggedPerson[];
  groups: GroupHealth[];
  community: CommunityInsights;
  celebrations: Signal[];
  study: StudySurface;
}) {
  const hasStudy = study.lastSermon || study.currentSeries || study.recentNotes.length > 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 16 }}>
        <h1 className="page">Bom te ver{greetingName ? `, ${greetingName}` : ""}</h1>
        <span className="sub" style={{ margin: "0 0 0 12px" }}>{activeCampus}{activeCampus ? " · " : ""}últimas 8 semanas</span>
      </div>

      {/* Hoje no Tally */}
      <div className={`panel ${styles.strip}`}>
        <div className="mi-k">Hoje no Tally</div>
        <div><b style={{ color: "var(--coral)", fontSize: 16 }}>{today.care}</b> <span className="muted">precisam de follow-up</span></div>
        <div><b style={{ color: "#E8833A", fontSize: 16 }}>{today.groupsAtt}</b> <span className="muted">grupos em atenção</span></div>
        <div><b style={{ color: "var(--blue)", fontSize: 16 }}>{today.noComm}</b> <span className="muted">sem comunidade</span></div>
        <div><b style={{ color: "#8b74e8", fontSize: 16 }}>{today.celeb}</b> <span className="muted">avançaram</span></div>
        <div><b style={{ color: "var(--green)", fontSize: 16 }}>{today.prayersAnswered}</b> <span className="muted">orações respondidas</span></div>
      </div>

      {/* Frequência + Risco pastoral */}
      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Frequência</h3><span className="muted" style={{ marginLeft: "auto" }}>presença real de culto</span></div>
          <FrequencyChart points={attendance} />
        </div>
        <div className="panel">
          <div className="ph"><h3>Risco pastoral</h3></div>
          <div className="donutwrap">
            <ConicDonut segments={[{ value: risk.em, color: RISK_COLOR.em }, { value: risk.at, color: RISK_COLOR.at }, { value: risk.ri, color: RISK_COLOR.ri }]}>
              <b>{risk.total}</b>
              <span>pessoas</span>
            </ConicDonut>
          </div>
          <div className="leg">
            <span><i style={{ background: RISK_COLOR.em }} />Em dia · {risk.em}</span>
            <span><i style={{ background: RISK_COLOR.at }} />Atenção · {risk.at}</span>
            <span><i style={{ background: RISK_COLOR.ri }} />Em risco · {risk.ri}</span>
          </div>
        </div>
      </div>

      {/* Care Radar + Grupos em atenção */}
      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Care Radar</h3><span className="muted" style={{ marginLeft: "auto" }}>Pessoas que precisam de atenção</span></div>
          {flagged.length === 0 ? (
            <div className="empty">Ninguém precisa de atenção agora.</div>
          ) : (
            flagged.slice(0, 8).map((p) => (
              <div key={p.id} className="li">
                <div className="av c">{initials(p.name)}</div>
                <div style={{ flex: 1 }}>
                  <div><b>{p.name}</b></div>
                  <div className="meta">{p.reasons[0]?.full ?? ""}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div className="ph"><h3>Grupos em atenção</h3><Link className="link" href="/groups" style={{ marginLeft: "auto" }}>Ver grupos</Link></div>
          {groups.length === 0 ? (
            <div className="empty">Sem grupos.</div>
          ) : (
            groups.slice(0, 3).map((g) => (
              <Link key={g.name} href="/groups" className={styles.gcard}>
                <div className={styles.gcardTop}><span>{g.name}</span><span className={`hb ${g.band}`}>{g.rate}%</span></div>
                <div className="gbar"><i className={g.band} style={{ width: `${g.rate}%` }} /></div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Comunidade */}
      <div className="row2" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="ph"><h3>Comunidade</h3><span className="muted" style={{ marginLeft: "auto" }}>onde as relações acontecem</span></div>
          <div className="li"><div><b>{community.inGroup} de {community.total}</b> em algum grupo <span className="muted">({community.connRate}% conectados)</span></div></div>
          {community.noGroup.length > 0 ? <div className="li"><div><b className={styles.neg}>{community.noGroup.length}</b> sem comunidade</div></div> : null}
          {community.groupsNoNew > 0 ? <div className="li"><div><b>{community.groupsNoNew}</b> grupo(s) sem novatos <span className="muted">(30 dias)</span></div></div> : null}
          {community.groupsNoLeader > 0 ? <div className="li"><div><b>{community.groupsNoLeader}</b> grupo(s) sem líder</div></div> : null}
          <div className="li">
            <div>{community.movement30 > 0 ? <><b>{community.movement30}</b> mudança(s) de estágio nos últimos 30 dias</> : <span className="muted">Sem movimento de jornada registrado ainda.</span>}</div>
          </div>
        </div>
        <div className="panel">
          <div className="ph"><h3>Pessoas sem comunidade</h3></div>
          {community.noGroup.length === 0 ? (
            <div className="empty">Todo mundo está em algum grupo.</div>
          ) : (
            community.noGroup.slice(0, 6).map((p) => (
              <div key={p.id} className="li">
                <div className="av c">{initials(p.name)}</div>
                <div><div><b>{p.name}</b></div><div className="meta">sem grupo{isVisitor(p.relationship) ? " · visitante" : ""}</div></div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Estudo (some quando a igreja ainda não usa) */}
      {hasStudy ? (
        <div className="row2" style={{ marginTop: 16 }}>
          <div className="panel">
            <div className="ph"><h3>Estudo</h3><Link className="link" href="/study" style={{ marginLeft: "auto" }}>Abrir Estudo</Link></div>
            <div style={{ padding: "6px 0" }}>
              <div className="mi-k">Último sermão</div>
              {study.lastSermon ? (
                <Link href={`/study/sermon/${study.lastSermon.id}`} className={styles.studyLink}>
                  <b>{study.lastSermon.title || "(sem título)"}</b>
                  <div className="meta">{[study.lastSermon.main_passage, study.lastSermon.sermon_date ? brDate(study.lastSermon.sermon_date) : SERMON_STATUS_LBL[study.lastSermon.status]].filter(Boolean).join(" · ")}</div>
                </Link>
              ) : <div className="empty">Nenhum sermão ainda.</div>}
            </div>
            <div style={{ padding: "6px 0" }}>
              <div className="mi-k">Série atual</div>
              {study.currentSeries ? (
                <Link href={`/study/series/${study.currentSeries.id}`} className={styles.studyLink}>
                  <b>{study.currentSeries.title || "(sem título)"}</b>
                  <div className="meta">{study.currentSeries.theme || "Série de ensino"}</div>
                </Link>
              ) : <div className="empty">Nenhuma série ativa.</div>}
            </div>
          </div>
          <div className="panel">
            <div className="ph"><h3>Atividade recente de estudo</h3></div>
            {study.recentNotes.length === 0 ? (
              <div className="empty">Sem atividade recente.</div>
            ) : (
              study.recentNotes.map((n) => (
                <Link key={n.id} href="/study/notes" className="li" style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ flex: 1 }}><b>{n.title || "(sem título)"}</b> <span className="muted">· nota</span></div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* Para celebrar (some quando não há) */}
      {celebrations.length > 0 ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="ph"><h3>Para celebrar</h3><span className="muted" style={{ marginLeft: "auto" }}>{celebrations.length} esta semana</span></div>
          {celebrations.map((s) => (
            <div key={s.key} className="li">
              <div className="av" style={{ background: "rgba(139,116,232,.16)", color: "#8b74e8" }}>{initials(s.stickName || "?")}</div>
              <div><div><b>{s.title}</b></div><div className="meta">{agoLabel(s.date)}</div></div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
