"use client";

import { useState } from "react";
import Link from "next/link";
import { agoLabel } from "@/lib/utils/date";
import { STUCK_DAYS, type StageStat, type FunnelRow, type MovementBucket, type FirstVisit } from "../domain";
import styles from "../journey.module.css";

function daysLabel(n: number | null): string {
  return n == null ? "—" : `${n} dia${n === 1 ? "" : "s"}`;
}

export function JourneyBoard({
  stats,
  funnel,
  movement,
  firstVisit,
}: {
  stats: StageStat[];
  funnel: FunnelRow[];
  movement: MovementBucket[];
  firstVisit: FirstVisit;
}) {
  const [focus, setFocus] = useState<string | null>(null);

  const total = stats.reduce((a, s) => a + s.count, 0);
  const maxCount = Math.max(1, ...stats.map((s) => s.count));
  const stuckTotal = stats.reduce((a, s) => a + s.stuck, 0);
  const mov6 = movement.reduce((a, b) => a + b.count, 0);
  const fmax = Math.max(1, ...funnel.map((f) => f.reached));
  const movMax = Math.max(1, ...movement.map((m) => m.count));
  const hasMov = movement.some((m) => m.count > 0);
  const focused = focus ? stats.find((s) => s.code === focus) : null;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <h1 className="page">Journey Map</h1>
        <p className="sub" style={{ margin: 0 }}>
          Como as pessoas se movem pela vida da igreja. Caminho operacional definido pela igreja, não um ranking espiritual.
        </p>
      </div>

      <div className="cards" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="k">Pessoas na jornada</div><div className="v">{total}</div></div>
        <div className={`stat${stuckTotal ? " alert" : ""}`}><div className="k">Parados +{STUCK_DAYS} dias</div><div className="v">{stuckTotal}</div></div>
        <div className="stat"><div className="k">Vieram uma vez</div><div className="v">{firstVisit.lost}</div></div>
        <div className="stat"><div className="k">Movimentos (6 meses)</div><div className="v">{mov6}</div></div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Estágios</h3><span className="muted" style={{ marginLeft: "auto" }}>clique para ver as pessoas</span></div>
          {stats.map((s) => {
            const w = Math.round((s.count / maxCount) * 100);
            const meta = s.count ? `tempo médio no estágio: ${daysLabel(s.avgDays)}${s.stuck ? ` · ${s.stuck} parado${s.stuck > 1 ? "s" : ""}` : ""}` : "ninguém aqui";
            return (
              <button key={s.code} className={`${styles.jmapRow}${focus === s.code ? " " + styles.jmapOn : ""}`} onClick={() => setFocus(focus === s.code ? null : s.code)}>
                <div className={styles.jmapHead}><span className={styles.jmapName}>{s.label}</span><span className={styles.jmapCount}>{s.count}</span></div>
                <div className="gbar"><i style={{ width: `${w}%`, background: "var(--blue)" }} /></div>
                <div className={`${styles.jmapMeta} muted`}>{meta}</div>
              </button>
            );
          })}
        </div>

        <div className="panel">
          <div className="ph"><h3>Onde as pessoas param</h3></div>
          {funnel.map((f) => {
            const w = Math.round((f.reached / fmax) * 100);
            return (
              <div key={f.label} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", fontSize: 13, marginBottom: 4, color: "var(--text)" }}>
                  <span>{f.label}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600 }}>
                    {f.reached}{f.dropFromPrev != null && f.dropFromPrev > 0 ? <span className="neg"> −{f.dropFromPrev}%</span> : null}
                  </span>
                </div>
                <div className="gbar"><i style={{ width: `${w}%`, background: "var(--blue)" }} /></div>
              </div>
            );
          })}
          <div className="ph" style={{ marginTop: 16 }}><h3>Primeira visita</h3></div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {firstVisit.came} vieram pela primeira vez · {firstVisit.returned} voltaram · <b>{firstVisit.lost}</b> ainda não voltaram.
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="ph"><h3>Movimento (6 meses)</h3><span className="muted" style={{ marginLeft: "auto" }}>mudanças de estágio por mês</span></div>
        {hasMov ? (
          <div className={styles.jmov}>
            {movement.map((m) => {
              const h = Math.max(Math.round((m.count / movMax) * 100), 4);
              return (
                <div key={m.key} className={styles.jmovCol}>
                  <div className={styles.jmovBarwrap}><div className={styles.jmovBar} style={{ height: `${h}%` }} /></div>
                  <span className={styles.jmovN}>{m.count}</span>
                  <span className={`${styles.jmovL} muted`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
            Ainda não há histórico de movimento suficiente. Conforme as pessoas mudam de estágio, a tendência aparece aqui — sem números inventados.
          </div>
        )}
      </div>

      {focused ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="ph">
            <h3>{focused.label} · {focused.count} pessoa{focused.count !== 1 ? "s" : ""}</h3>
            <button className="link" style={{ marginLeft: "auto" }} onClick={() => setFocus(null)}>limpar</button>
          </div>
          {focused.people.length ? (
            [...focused.people].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
              <Link key={p.id} href="/sticks" className={styles.jdrillRow}>
                <span className={styles.jdrillNm}>{p.name}</span>
                <span className="muted">{p.group || "sem grupo"} · {agoLabel(p.lastSeen)}</span>
              </Link>
            ))
          ) : (
            <div className="empty">Ninguém neste estágio.</div>
          )}
        </div>
      ) : null}
    </>
  );
}
