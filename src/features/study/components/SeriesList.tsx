"use client";

// Página Séries (spec 9): linhas no padrão das de sermão (título + "nº · período" e o
// status à direita). "Nova série" abre o mesmo modal de sempre.
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { SERIES_LBL, seriesPeriod } from "../domain";
import type { Series } from "../types";
import { SeriesModal } from "./SeriesModal";
import styles from "../study.module.css";

export function SeriesList({ series, count }: { series: Series[]; count: Record<string, number> }) {
  const [modal, setModal] = useState(false);
  return (
    <div className={styles.lib}>
      <Link href="/study" className={styles.back}><UiIcon icon={ChevronLeft} />Sermões</Link>
      <div className={styles.libHead}>
        <h1 className="page">Séries</h1>
        {series.length ? <button type="button" className={styles.primary} onClick={() => setModal(true)}>Nova série</button> : null}
      </div>
      {series.length === 0 ? (
        <div className={styles.libEmpty}>
          <p>Agrupe sermões numa jornada de ensino.</p>
          <button type="button" className={styles.primary} onClick={() => setModal(true)}>Nova série</button>
        </div>
      ) : (
        series.map((se) => {
          const n = count[se.id] ?? 0;
          const sub = [`${n} ${n === 1 ? "sermão" : "sermões"}`, seriesPeriod(se.start_date, se.end_date)].filter(Boolean).join(" · ");
          return (
            <Link key={se.id} href={`/study/series/${se.id}`} className={`${styles.srm} ${styles.srmNoDot}`}>
              <span className={styles.srmMain}>
                <span className={styles.srmTitle}>{se.title || "(sem título)"}</span>
                <span className={styles.srmSub}>{sub}</span>
              </span>
              <span className={styles.srmDate}>{SERIES_LBL[se.status]}</span>
            </Link>
          );
        })
      )}
      {modal ? <SeriesModal onClose={() => setModal(false)} /> : null}
    </div>
  );
}
