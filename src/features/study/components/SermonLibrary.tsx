"use client";

// Biblioteca de Sermões (spec 9). Busca + chips de filtro (Todos | Em preparo |
// Pregados, que somam com Série e Livro). Os filtros vão para a URL (?f=&serie=&livro=)
// com replaceState, sem recarregar. Com texto na busca, vira uma lista única.
import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  STATUS_COLOR,
  STATUS_LBL,
  booksWithSermons,
  editedAgo,
  filterSermons,
  inProgressSermon,
  libraryGroups,
  missingParts,
  searchSermons,
  shortDate,
  type SermonFilter,
} from "../domain";
import type { Sermon, Series } from "../types";
import { bookName } from "@/lib/bible/books";
import { SeriesModal } from "./SeriesModal";
import { Chip, MenuChip, MenuItem } from "./FilterChips";
import { UiIcon } from "@/components/shared/UiIcon";
import { ChevronRight } from "lucide-react";
import styles from "../study.module.css";

function filterUrl(f: SermonFilter): string {
  const p = new URLSearchParams();
  if (f.status) p.set("f", f.status);
  if (f.seriesId) p.set("serie", f.seriesId);
  if (f.book) p.set("livro", f.book);
  const qs = p.toString();
  return qs ? `/study?${qs}` : "/study";
}

export function SermonLibrary({ sermons, series, initial }: { sermons: Sermon[]; series: Series[]; initial: SermonFilter }) {
  const router = useRouter();
  const [f, setF] = useState<SermonFilter>(initial);
  const [q, setQ] = useState("");
  const [newSeries, setNewSeries] = useState(false);

  const seriesTitleById = useMemo(() => new Map(series.map((s) => [s.id, s.title || "(sem título)"])), [series]);
  const books = useMemo(() => booksWithSermons(sermons), [sermons]);
  const filtered = useMemo(() => filterSermons(sermons, f), [sermons, f]);
  const cont = useMemo(() => inProgressSermon(filtered), [filtered]);
  const groups = useMemo(() => libraryGroups(filtered, cont?.id ?? null), [filtered, cont]);
  const searching = q.trim().length > 0;
  const results = searching ? searchSermons(filtered, q, seriesTitleById) : [];

  function apply(next: Partial<SermonFilter>) {
    const v = { ...f, ...next };
    setF(v);
    window.history.replaceState(null, "", filterUrl(v));
  }

  const empty = sermons.length === 0 && series.length === 0;
  const header = (
    <div className={styles.libHead}>
      <h1 className="page">Sermões</h1>
      {empty ? null : <Link href="/study/sermon/new" className={styles.primary}>Novo sermão</Link>}
    </div>
  );

  if (empty) {
    return (
      <div className={styles.lib}>
        {header}
        <div className={styles.libEmpty}>
          <p>Seu primeiro sermão começa por uma passagem.</p>
          <Link href="/study/sermon/new" className={styles.primary}>Novo sermão</Link>
        </div>
      </div>
    );
  }

  const countBySeries = new Map<string, number>();
  for (const s of sermons) if (s.series_id) countBySeries.set(s.series_id, (countBySeries.get(s.series_id) ?? 0) + 1);
  const hint = cont ? missingParts(cont)[0] : "";
  const row = (s: Sermon) => <Row key={s.id} s={s} titles={seriesTitleById} />;

  return (
    <div className={styles.lib}>
      {header}

      <input
        className={styles.libSearch}
        type="search"
        placeholder="Buscar por título, passagem ou série"
        aria-label="Buscar por título, passagem ou série"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className={styles.chipRow} role="group" aria-label="Filtros">
        <Chip on={!f.status} onClick={() => apply({ status: null })}>Todos</Chip>
        <Chip on={f.status === "preparo"} onClick={() => apply({ status: "preparo" })}>Em preparo</Chip>
        <Chip on={f.status === "pregados"} onClick={() => apply({ status: "pregados" })}>Pregados</Chip>
        <MenuChip label="Série" value={f.seriesId ? seriesTitleById.get(f.seriesId) ?? null : null} onClear={() => apply({ seriesId: null })}>
          {(close) => (
            <>
              {series.length ? (
                <div className={styles.popList}>
                  {series.map((se) => (
                    <MenuItem key={se.id} on={f.seriesId === se.id} count={countBySeries.get(se.id) ?? 0} onClick={() => { apply({ seriesId: se.id }); close(); }}>
                      {se.title || "(sem título)"}
                    </MenuItem>
                  ))}
                </div>
              ) : null}
              {series.length ? <hr className={styles.miSep} /> : null}
              <button type="button" role="menuitem" className={styles.mi} onClick={() => router.push("/study/series")}>Ver séries</button>
              <button type="button" role="menuitem" className={styles.mi} onClick={() => { close(); setNewSeries(true); }}>Nova série</button>
            </>
          )}
        </MenuChip>
        <MenuChip label="Livro" value={f.book ? bookName(f.book) : null} onClear={() => apply({ book: null })}>
          {(close) =>
            books.length === 0 ? (
              <p className={styles.miEmpty}>Nenhum sermão com passagem ainda.</p>
            ) : (
              <div className={styles.popList}>
                {books.map((b) => (
                  <MenuItem key={b.code} on={f.book === b.code} count={b.count} onClick={() => { apply({ book: b.code }); close(); }}>
                    {b.name}
                  </MenuItem>
                ))}
              </div>
            )
          }
        </MenuChip>
      </div>

      {searching ? (
        <>
          <div className={styles.libCount}>{results.length} {results.length === 1 ? "resultado" : "resultados"}</div>
          {results.length === 0 ? <div className={styles.libEmpty}>Nada encontrado para “{q.trim()}”.</div> : results.map(row)}
        </>
      ) : filtered.length === 0 ? (
        <div className={styles.libEmpty}>Nenhum sermão com esses filtros.</div>
      ) : (
        <>
          {cont ? (
            <>
              <h2 className={styles.libSec}>Continuar</h2>
              <Link href={`/study/sermon/${cont.id}`} className={styles.cont}>
                <span className={styles.contSt}>
                  <i className={styles.dot} style={{ "--dot": STATUS_COLOR[cont.status] } as CSSProperties} />
                  {STATUS_LBL[cont.status]}
                </span>
                <span className={styles.contTitle}>{cont.title || "(sem título)"}</span>
                {cont.main_passage ? <span className={styles.contRef}>{cont.main_passage}</span> : null}
                {cont.big_idea.trim() ? <span className={styles.contIdea}>{cont.big_idea}</span> : null}
                <span className={styles.contMeta}>{[editedAgo(cont.updated_at), hint].filter(Boolean).join(" · ")}</span>
              </Link>
            </>
          ) : null}

          {groups.open.length ? (
            <section>
              <h2 className={styles.libSec}>Em preparo</h2>
              {groups.open.map(row)}
            </section>
          ) : null}

          {groups.preached.map((g) => (
            <section key={g.year}>
              <h2 className={styles.libSec}>{g.year ? `Pregados · ${g.year}` : "Pregados"}</h2>
              {g.items.map(row)}
            </section>
          ))}

          {groups.archived.length ? (
            <details className={styles.libArch}>
              <summary>
                <UiIcon icon={ChevronRight} className={styles.chev} />
                Arquivados ({groups.archived.length})
              </summary>
              {groups.archived.map(row)}
            </details>
          ) : null}
        </>
      )}

      {newSeries ? <SeriesModal onClose={() => setNewSeries(false)} /> : null}
    </div>
  );
}

// Linha de sermão: bolinha de status | título + "passagem · série" | data.
function Row({ s, titles }: { s: Sermon; titles: Map<string, string> }) {
  const sub = [s.main_passage, s.series_id ? titles.get(s.series_id) : ""].filter(Boolean).join(" · ");
  return (
    <Link href={`/study/sermon/${s.id}`} className={styles.srm}>
      <i className={styles.dot} style={{ "--dot": STATUS_COLOR[s.status] } as CSSProperties} aria-label={STATUS_LBL[s.status]} />
      <span className={styles.srmMain}>
        <span className={styles.srmTitle}>{s.title || "(sem título)"}</span>
        {sub ? <span className={styles.srmSub}>{sub}</span> : null}
      </span>
      <span className={styles.srmDate}>{shortDate(s.sermon_date) || "sem data"}</span>
    </Link>
  );
}
