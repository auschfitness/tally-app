"use client";

// Biblioteca de Trilhas (Client — dono do botão "Nova trilha" e do modal). Os cards
// são Links para o detalhe; o resumo (etapas/matriculados/concluídos) vem do domínio.
import { useState } from "react";
import Link from "next/link";
import { trackSummary } from "../domain";
import type { Enrollment, Track } from "../types";
import { NewTrackModal } from "./NewTrackModal";
import styles from "../tracks.module.css";

export function TracksBoard({ tracks, enrollments }: { tracks: Track[]; enrollments: Enrollment[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className="page">Trilhas</h1>
          <p className="sub" style={{ margin: 0 }}>Discipulado com caminho claro. Progresso é participação, não nota.</p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>+ Nova trilha</button>
      </div>

      {tracks.length === 0 ? (
        <div className="empty">Nenhuma trilha ainda. Crie a primeira (ex.: Fundamentos da Fé).</div>
      ) : (
        <div className={styles.cards}>
          {tracks.map((t) => {
            const s = trackSummary(t, enrollments);
            return (
              <Link key={t.id} href={`/tracks/${t.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{t.name || "(sem nome)"}</span>
                  <span className="muted" style={{ marginLeft: "auto" }}>{s.steps} etapa{s.steps !== 1 ? "s" : ""}</span>
                </div>
                <div className={styles.cardSub}>
                  {t.type ? `${t.type} · ` : ""}
                  {s.enrolled} matriculado{s.enrolled !== 1 ? "s" : ""}
                  {s.completed ? ` · ${s.completed} concluíram` : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open ? <NewTrackModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
