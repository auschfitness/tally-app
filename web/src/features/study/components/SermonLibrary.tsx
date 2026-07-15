"use client";

// Biblioteca de Sermões (Client): filtros (status/campus/série) e cards agrupados
// por série. "+ Novo sermão" abre o editor. Séries (cards + workspace) e demais abas
// entram nas próximas fatias.
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { STATUS_BAND, STATUS_LBL, SERMON_STATUSES, filterSermons, type SermonFilter } from "../domain";
import type { Sermon, Series } from "../types";
import { brDate } from "@/lib/utils/date";
import styles from "../study.module.css";

export function SermonLibrary({
  sermons,
  series,
  campuses,
}: {
  sermons: Sermon[];
  series: Series[];
  campuses: string[];
}) {
  const [filter, setFilter] = useState<SermonFilter>({ status: null, campus: null, series: null });
  const seriesById = useMemo(() => new Map(series.map((s) => [s.id, s])), [series]);
  const list = filterSermons(sermons, filter);

  function Card({ s }: { s: Sermon }) {
    const se = s.series_id ? seriesById.get(s.series_id) : null;
    const meta =
      (s.main_passage ? s.main_passage + " · " : "") +
      (s.campus ? s.campus + " · " : "") +
      (s.sermon_date ? brDate(s.sermon_date) : "sem data") +
      (se ? " · " + se.title : "");
    return (
      <Link href={`/study/sermon/${s.id}`} className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>{s.title || "(sem título)"}</span>
          <span className={`hb ${STATUS_BAND[s.status] || "attention"}`} style={{ marginLeft: "auto" }}>{STATUS_LBL[s.status] || s.status}</span>
        </div>
        <div className={styles.cardSub}>{meta}</div>
        {s.big_idea ? <div className={styles.cardFoot}>{s.big_idea}</div> : null}
      </Link>
    );
  }

  // Cards agrupados por série quando há séries; flat quando não há.
  let body: ReactNode;
  if (list.length === 0) {
    body = <div className="empty">Nenhum sermão ainda. Comece o primeiro em “+ Novo sermão”.</div>;
  } else if (series.length === 0) {
    body = <div className={styles.cards}>{list.map((s) => <Card key={s.id} s={s} />)}</div>;
  } else {
    const groups: { label: string; items: Sermon[] }[] = [];
    for (const se of series) {
      const items = list.filter((x) => x.series_id === se.id);
      if (items.length) groups.push({ label: se.title || "(sem título)", items });
    }
    const loose = list.filter((x) => !x.series_id);
    if (loose.length) groups.push({ label: "Sem série", items: loose });
    body = groups.map((g) => (
      <div key={g.label}>
        <div className="ph" style={{ margin: "4px 0 6px" }}>
          <h3 className="muted" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{g.label}</h3>
        </div>
        <div className={styles.cards} style={{ marginBottom: 16 }}>{g.items.map((s) => <Card key={s.id} s={s} />)}</div>
      </div>
    ));
  }

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h1 className="page">Estudo</h1>
          <p className="sub" style={{ margin: 0 }}>Onde a igreja prepara e preserva o ensino. A Bíblia é a fundação; o Tally organiza.</p>
        </div>
        <Link href="/study/sermon/new" className="btn" style={{ marginLeft: "auto" }}>+ Novo sermão</Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.chips}>
          <button className={`${styles.fchip}${!filter.status ? " " + styles.on : ""}`} onClick={() => setFilter((f) => ({ ...f, status: null }))}>Todos</button>
          {SERMON_STATUSES.map((st) => (
            <button key={st} className={`${styles.fchip}${filter.status === st ? " " + styles.on : ""}`} onClick={() => setFilter((f) => ({ ...f, status: st }))}>{STATUS_LBL[st]}</button>
          ))}
        </div>
        <select className={styles.select} style={{ marginLeft: "auto" }} value={filter.campus ?? ""} onChange={(e) => setFilter((f) => ({ ...f, campus: e.target.value || null }))}>
          <option value="">Todos os campus</option>
          {campuses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.select} value={filter.series ?? ""} onChange={(e) => setFilter((f) => ({ ...f, series: e.target.value || null }))}>
          <option value="">Todas as séries</option>
          <option value="__none__">Sem série</option>
          {series.map((se) => <option key={se.id} value={se.id}>{se.title || "(sem título)"}</option>)}
        </select>
      </div>

      {body}
    </>
  );
}
