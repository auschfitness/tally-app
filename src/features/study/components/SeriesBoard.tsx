"use client";

// Séries — a casa própria da série (spec 06: "Nova série sai da barra principal, é
// ação de série, vive na tela de séries"). Escopo deliberadamente mínimo: LISTAR,
// CRIAR, ABRIR. Sem edição em massa, sem reordenar, sem arquivar, sem contadores —
// nada disso foi pedido, e cada um deles teria que responder a uma pergunta que o
// pastor faz de verdade.
//
//   h1 "Estudo"       → onde eu estou? (a sub-nav diz qual tela)
//   "+ Nova série"    → como agrupo os próximos sermões? (ÚNICA ação primária)
//   linha da série    → qual série, sobre que tema, em que período?
import { useState } from "react";
import Link from "next/link";
import { SeriesModal } from "./SeriesModal";
import { SERIES_LBL } from "../domain";
import type { Series } from "../types";
import { brDateCompact } from "@/lib/utils/date";
import styles from "../study.module.css";

export function SeriesBoard({ series }: { series: Series[] }) {
  const [creating, setCreating] = useState(false);
  // Se TODAS as séries estão no mesmo estado, a palavra se repete em toda linha e
  // deixa de ser informação — some. (Igreja com três séries, todas "Ativa": dizer
  // "Ativa" três vezes não responde pergunta nenhuma.)
  const showStatus = new Set(series.map((s) => s.status)).size > 1;

  function meta(se: Series): string {
    const period = se.start_date || se.end_date ? `${brDateCompact(se.start_date) || "…"} — ${brDateCompact(se.end_date) || "…"}` : "";
    // filter() antes do join: sem ele, uma série sem tema nasce com " · " órfão.
    return [se.theme, showStatus ? SERIES_LBL[se.status] : "", period].filter(Boolean).join(" · ");
  }

  return (
    <div className={styles.lib}>
      <div className={styles.libHeader}>
        <div className={styles.libHeaderText}>
          <h1 className="page">Estudo</h1>
          <p className="sub" style={{ margin: 0 }}>Séries agrupam sermões numa jornada de ensino.</p>
        </div>
        <button className={`btn ${styles.libAction}`} onClick={() => setCreating(true)}>+ Nova série</button>
      </div>

      {series.length === 0 ? (
        <div className="empty">Nenhuma série ainda. Agrupe sermões numa jornada de ensino em “+ Nova série”.</div>
      ) : (
        <div className={styles.rows}>
          {series.map((se) => (
            <Link key={se.id} href={`/study/series/${se.id}`} className={styles.row}>
              <span className={styles.rowHead}>
                <span className={styles.rowTitle}>{se.title || "(sem título)"}</span>
              </span>
              {meta(se) ? <span className={styles.rowMeta}>{meta(se)}</span> : null}
            </Link>
          ))}
        </div>
      )}

      {creating ? <SeriesModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
