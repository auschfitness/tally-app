"use client";

// Lista de Eventos: cards (data desc) filtrados por campus. Dona do botão "+ Novo
// evento" e do modal de criar.
import { useState } from "react";
import Link from "next/link";
import { STATUS_BAND, STATUS_LBL, capacityLabel, sortEvents, whenLabel } from "../domain";
import type { EventItem } from "../types";
import { EventModal } from "./EventModal";
import styles from "../events.module.css";

export function EventsBoard({
  events,
  countByEvent,
  campuses,
  activeCampus,
}: {
  events: EventItem[];
  countByEvent: Record<string, number>;
  campuses: string[];
  activeCampus: string;
}) {
  const [open, setOpen] = useState(false);
  const visible = sortEvents(events.filter((e) => !e.campus || e.campus === activeCampus));

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h1 className="page">Eventos</h1>
          <p className="sub" style={{ margin: 0 }}>
            Encontros especiais da igreja. Inscrição e check-in são internos (a equipe registra). Página pública e pagamento chegam depois.
          </p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>+ Novo evento</button>
      </div>

      {visible.length === 0 ? (
        <div className="empty">Nenhum evento ainda. Cadastre conferências, retiros, cursos ou eventos especiais em “+ Novo evento”.</div>
      ) : (
        <div className={styles.cards}>
          {visible.map((e) => {
            const n = countByEvent[e.id] ?? 0;
            return (
              <Link key={e.id} href={`/events/${e.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{e.name || "(sem nome)"}</span>
                  <span className={`hb ${STATUS_BAND[e.status] || "attention"}`} style={{ marginLeft: "auto" }}>{STATUS_LBL[e.status] || e.status}</span>
                </div>
                <div className={styles.cardSub}>{whenLabel(e)}{e.type ? ` · ${e.type}` : ""}</div>
                <div className={styles.cardFoot}>{e.location ? e.location : "sem local"}{capacityLabel(n, e.capacity)}</div>
              </Link>
            );
          })}
        </div>
      )}

      {open ? <EventModal campuses={campuses} activeCampus={activeCampus} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
