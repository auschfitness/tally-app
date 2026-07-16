"use client";

// Lista de Cultos: cards ordenados por dia/horário. Dona do botão "+ Novo culto"
// e do modal de criar.
import { useState } from "react";
import Link from "next/link";
import { sortServices, whenLabel } from "../domain";
import type { Service } from "../types";
import { ServiceModal } from "./ServiceModal";
import styles from "../services.module.css";

export function ServicesBoard({
  services,
  occByService,
  campuses,
  activeCampus,
}: {
  services: Service[];
  occByService: Record<string, number>;
  campuses: string[];
  activeCampus: string;
}) {
  const [open, setOpen] = useState(false);
  const visible = sortServices(services.filter((s) => !s.campus || s.campus === activeCampus));

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h1 className="page">Cultos</h1>
          <p className="sub" style={{ margin: 0 }}>
            Os encontros recorrentes da igreja. Cada culto gera presença real e alimenta o resto do Tally.
          </p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>+ Novo culto</button>
      </div>

      {visible.length === 0 ? (
        <div className="empty">Nenhum culto ainda. Cadastre os cultos recorrentes da igreja (ex.: Domingo 9h, Quarta de oração) em “+ Novo culto”.</div>
      ) : (
        <div className={styles.cards}>
          {visible.map((s) => {
            const n = occByService[s.id] ?? 0;
            return (
              <Link key={s.id} href={`/services/${s.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{s.name || "(sem nome)"}</span>
                  <span className={`hb ${s.active ? "healthy" : "risk"}`} style={{ marginLeft: "auto" }}>{s.active ? "Ativo" : "Inativo"}</span>
                </div>
                <div className={styles.cardSub}>{whenLabel(s)}{s.type ? ` · ${s.type}` : ""}</div>
                <div className={styles.cardFoot}>
                  {s.location ? `${s.location} · ` : ""}{n} ocorrência{n !== 1 ? "s" : ""} registrada{n !== 1 ? "s" : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open ? <ServiceModal campuses={campuses} activeCampus={activeCampus} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
