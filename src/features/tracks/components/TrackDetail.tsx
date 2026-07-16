// Detalhe da trilha (Server Component): etapas + matriculados (com progresso de
// participação) + material de ensino. As mutações são forms de Server Action
// (addStep / enroll / advance) — sem estado de cliente. "Material de ensino" são
// sermões vinculados via content.track_id (leitura da feature Study já migrada).
import Link from "next/link";
import { initials } from "@/lib/utils/date";
import { enrollmentPosition, sortSteps } from "../domain";
import { addStepAction, enrollAction, advanceStepAction } from "../actions";
import type { Enrollment, PersonOption, TeachingSermon, Track } from "../types";

export function TrackDetail({
  track,
  enrollments,
  nameByStick,
  people,
  teaching,
}: {
  track: Track;
  enrollments: Enrollment[];
  nameByStick: Record<string, string>;
  people: PersonOption[];
  teaching: TeachingSermon[];
}) {
  const steps = sortSteps(track.steps);
  const total = steps.length;

  return (
    <>
      <Link href="/tracks" className="link">← Voltar às trilhas</Link>
      <div style={{ margin: "10px 0 18px" }}>
        <h1 className="page">{track.name}</h1>
        <p className="sub" style={{ margin: 0 }}>{track.description || "Trilha de discipulado"}</p>
      </div>

      <div className="row2">
        {/* Etapas */}
        <div className="panel">
          <div className="ph"><h3>Etapas</h3></div>
          {steps.length === 0 ? (
            <div className="empty">Sem etapas. Adicione a primeira abaixo.</div>
          ) : (
            steps.map((s) => (
              <div key={s.id} className="li">
                <div className="av">{s.position}</div>
                <div>
                  <div><b>{s.name}</b></div>
                  {s.description ? <div className="meta">{s.description}</div> : null}
                </div>
              </div>
            ))
          )}
          <form className="mrow" action={addStepAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="trackId" value={track.id} />
            <div className="field">
              <label>Nova etapa</label>
              <input name="name" placeholder="Ex.: Batismo" />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn ghost" type="submit">Adicionar etapa</button>
            </div>
          </form>
        </div>

        {/* Matriculados */}
        <div className="panel">
          <div className="ph"><h3>Matriculados</h3></div>
          {enrollments.length === 0 ? (
            <div className="empty">Ninguém matriculado ainda.</div>
          ) : (
            enrollments.map((e) => {
              const nome = nameByStick[e.stick_id] ?? "—";
              const { pos, pct, completed } = enrollmentPosition(e, steps);
              return (
                <div key={e.id} className="li">
                  <div className={`av${completed ? "" : " c"}`}>{initials(nome)}</div>
                  <div style={{ flex: 1 }}>
                    <div><b>{nome}</b> <span className="muted">· {pos} de {total}</span></div>
                    <div className="gbar" style={{ marginTop: 5 }}><i className="healthy" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="right">
                    {completed ? (
                      <span className="hb healthy">Concluída</span>
                    ) : (
                      <form action={advanceStepAction}>
                        <input type="hidden" name="enrollmentId" value={e.id} />
                        <button className="btn ghost sm" type="submit">Avançar etapa</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div style={{ marginTop: 12 }}>
            {people.length === 0 ? (
              <div className="muted">Todos do campus já estão matriculados.</div>
            ) : (
              <form className="mrow" action={enrollAction}>
                <input type="hidden" name="trackId" value={track.id} />
                <div className="field">
                  <label>Matricular pessoa</label>
                  <select name="stickId" defaultValue={people[0]?.id ?? ""}>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="btn ghost" type="submit">Matricular</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Material de ensino: sermões vinculados a esta trilha (content.track_id). */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="ph">
          <h3>Material de ensino</h3>
          <span className="muted" style={{ marginLeft: "auto" }}>{teaching.length} {teaching.length === 1 ? "sermão" : "sermões"}</span>
        </div>
        {teaching.length === 0 ? (
          <div className="empty">Nenhum sermão vinculado como material desta trilha. Vincule pelo editor de sermão (Propriedades → Trilha).</div>
        ) : (
          teaching.map((s) => (
            <Link key={s.id} href={`/study/sermon/${s.id}`} className="li" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ flex: 1 }}>
                <b>{s.title || "(sem título)"}</b>
                {s.main_passage ? <span className="muted"> · {s.main_passage}</span> : null}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
