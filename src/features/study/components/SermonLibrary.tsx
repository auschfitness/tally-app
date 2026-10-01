"use client";

// Biblioteca de Sermões (spec 10). Uma busca e um segmentado "Por data | Por série |
// Por livro"; com texto na busca, vira uma lista única de resultados. O segmento vai
// para a URL (?ver=) sem recarregar a página.
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SERIES_LBL,
  STATUS_COLOR,
  STATUS_LBL,
  editedAgo,
  inProgressSermon,
  libraryGroups,
  missingParts,
  searchSermons,
  seriesPeriod,
  shortDate,
} from "../domain";
import type { Scripture, Sermon, Series } from "../types";
import { SeriesModal } from "./SeriesModal";
import { ScriptureMap } from "./ScriptureMap";
import styles from "../study.module.css";

export type LibraryView = "data" | "serie" | "livro";
const VIEWS: [LibraryView, string][] = [["data", "Por data"], ["serie", "Por série"], ["livro", "Por livro"]];
const TRASH_PATH = "M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6.5M14 10.5v6.5";

export function SermonLibrary({
  sermons,
  series,
  scriptures,
  ver,
}: {
  sermons: Sermon[];
  series: Series[];
  scriptures: Scripture[];
  ver: LibraryView;
}) {
  const [view, setView] = useState<LibraryView>(ver);
  const [q, setQ] = useState("");
  const [newSeries, setNewSeries] = useState(false);

  const seriesTitleById = useMemo(() => new Map(series.map((s) => [s.id, s.title || "(sem título)"])), [series]);
  const cont = useMemo(() => inProgressSermon(sermons), [sermons]);
  const groups = useMemo(() => libraryGroups(sermons, cont?.id ?? null), [sermons, cont]);
  const searching = q.trim().length > 0;
  const results = searching ? searchSermons(sermons, q, seriesTitleById) : [];

  function pick(v: LibraryView) {
    setView(v);
    // replaceState: a URL acompanha o segmento sem nova ida ao servidor.
    window.history.replaceState(null, "", v === "data" ? "/study" : `/study?ver=${v}`);
  }

  const header = (
    <div className={styles.libHead}>
      <h1 className="page">Sermões</h1>
      <Link href="/study/sermon/new" className={styles.primary}>Novo sermão</Link>
    </div>
  );

  if (sermons.length === 0 && series.length === 0) {
    return (
      <div className={styles.lib}>
        {header}
        <div className={styles.libEmpty}>
          <p>Seu primeiro sermão começa por uma passagem.</p>
          <Link href="/study/sermon/new" className={styles.primary}>Novo sermão</Link>
        </div>
        <TrashLink />
      </div>
    );
  }

  const hint = cont ? missingParts(cont)[0] : "";
  const countBySeries = new Map<string, number>();
  for (const s of sermons) if (s.series_id) countBySeries.set(s.series_id, (countBySeries.get(s.series_id) ?? 0) + 1);
  const loose = sermons.filter((s) => !s.series_id || !seriesTitleById.has(s.series_id));

  return (
    <div className={styles.lib}>
      {header}

      <div className={styles.libBar}>
        <input
          className={styles.libSearch}
          type="search"
          placeholder="Buscar por título, passagem ou série"
          aria-label="Buscar por título, passagem ou série"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {searching ? null : (
          <div className={styles.segmented} role="group" aria-label="Visão">
            {VIEWS.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => pick(v)}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {searching ? (
        <>
          <div className={styles.libCount}>{results.length} {results.length === 1 ? "resultado" : "resultados"}</div>
          {results.length === 0 ? <div className="empty">Nada encontrado para “{q.trim()}”.</div> : results.map((s) => <Row key={s.id} s={s} titles={seriesTitleById} />)}
        </>
      ) : view === "data" ? (
        <>
          {cont ? (
            <>
              <h2 className={styles.libSec}>Continuar</h2>
              <Link href={`/study/sermon/${cont.id}`} className={styles.cont}>
                <span className={styles.contSt}>
                  <i className={styles.dot} style={{ background: STATUS_COLOR[cont.status] }} />
                  {STATUS_LBL[cont.status]}
                </span>
                <span className={styles.contTitle}>{cont.title || "(sem título)"}</span>
                {cont.main_passage ? <span className={styles.contRef}>{cont.main_passage}</span> : null}
                {cont.big_idea.trim() ? <span className={styles.contIdea}>{cont.big_idea}</span> : null}
                <span className={styles.contMeta}>{[editedAgo(cont.updated_at), hint].filter(Boolean).join(" · ")}</span>
                <span className={`${styles.primary} ${styles.contBtn}`}>Continuar escrevendo</span>
              </Link>
            </>
          ) : null}

          {groups.open.length ? (
            <>
              <h2 className={styles.libSec}>Em preparo</h2>
              {groups.open.map((s) => <Row key={s.id} s={s} titles={seriesTitleById} />)}
            </>
          ) : null}

          {groups.preached.length ? (
            <>
              <h2 className={styles.libSec}>Pregados</h2>
              {groups.preached.map((g) => (
                <div key={g.year}>
                  {g.year ? <div className={styles.libYear}>{g.year}</div> : null}
                  {g.items.map((s) => <Row key={s.id} s={s} titles={seriesTitleById} />)}
                </div>
              ))}
            </>
          ) : null}

          {groups.archived.length ? (
            <details className={styles.libArch}>
              <summary>
                <Chevron />
                Arquivados ({groups.archived.length})
              </summary>
              {groups.archived.map((s) => <Row key={s.id} s={s} titles={seriesTitleById} />)}
            </details>
          ) : null}
        </>
      ) : view === "serie" ? (
        <>
          <div className={styles.libSerHead}>
            <h2 className={styles.libSec}>Suas séries</h2>
            <button type="button" className={styles.secondary} onClick={() => setNewSeries(true)}>Nova série</button>
          </div>
          {series.length === 0 ? <div className="empty">Nenhuma série ainda. Agrupe sermões numa jornada de ensino em “Nova série”.</div> : null}
          {series.map((se) => {
            const n = countBySeries.get(se.id) ?? 0;
            const info = [`${n} ${n === 1 ? "sermão" : "sermões"}`, seriesPeriod(se.start_date, se.end_date)].filter(Boolean).join(" · ");
            return (
              <Link key={se.id} href={`/study/series/${se.id}`} className={styles.ser}>
                <span className={styles.serText}>
                  <span className={styles.serTitle}>{se.title || "(sem título)"}</span>
                  <span className={styles.srmSub}>{info}</span>
                </span>
                <span className={styles.serSt}>{SERIES_LBL[se.status]}</span>
              </Link>
            );
          })}
          {loose.length ? (
            <details className={styles.libArch}>
              <summary>
                <Chevron />
                Sem série ({loose.length})
              </summary>
              {loose.map((s) => <Row key={s.id} s={s} titles={seriesTitleById} />)}
            </details>
          ) : null}
        </>
      ) : (
        <ScriptureMap scriptures={scriptures} sermons={sermons.map((s) => ({ id: s.id, title: s.title, sermon_date: s.sermon_date }))} />
      )}

      <TrashLink />
      {newSeries ? <SeriesModal onClose={() => setNewSeries(false)} /> : null}
    </div>
  );
}

// Linha de sermão (igual em todas as listas): data, título, "passagem · série".
function Row({ s, titles }: { s: Sermon; titles: Map<string, string> }) {
  const sub = [s.main_passage, s.series_id ? titles.get(s.series_id) : ""].filter(Boolean).join(" · ");
  return (
    <Link href={`/study/sermon/${s.id}`} className={styles.srm}>
      <span className={`${styles.srmDate}${s.sermon_date ? "" : " " + styles.srmNoDate}`}>{shortDate(s.sermon_date) || "sem data"}</span>
      <span className={styles.srmTitle}>{s.title || "(sem título)"}</span>
      {sub ? <span className={styles.srmSub}>{sub}</span> : null}
    </Link>
  );
}

function Chevron() {
  return (
    <svg className={styles.chev} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// Rodapé discreto: é o caminho da Lixeira no celular.
export function TrashLink() {
  return (
    <div className={styles.libFoot}>
      <Link href="/study/trash">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={TRASH_PATH} /></svg>
        Lixeira
      </Link>
    </div>
  );
}
