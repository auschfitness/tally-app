"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ConicDonut } from "@/components/shared/ConicDonut";
import { groupsHealth, type Band, type Group } from "../domain";
import type { Person } from "@/features/sticks/types";
import { NewGroupModal } from "./NewGroupModal";
import styles from "../groups.module.css";

const BAND_COLOR: Record<Band, string> = { healthy: "#1FA97A", attention: "#E8833A", risk: "#EA5B4C" };

export function GroupsBoard({
  people,
  groups,
  activeCampus,
  campuses,
}: {
  people: Person[];
  groups: Group[];
  activeCampus: string;
  campuses: string[];
}) {
  const [band, setBand] = useState<Band | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const health = useMemo(() => groupsHealth(people, groups, activeCampus), [people, groups, activeCampus]);
  const counts = { healthy: 0, attention: 0, risk: 0 };
  for (const g of health) counts[g.band]++;

  const cards = band ? health.filter((g) => g.band === band) : health;
  const members = people.filter((p) => p.campus === activeCampus);

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 className="page">Saúde dos Grupos</h1>
          <p className="sub" style={{ margin: 0 }}>
            {activeCampus} · toque num grupo para ver o relatório
            {band ? <button className="link" style={{ marginLeft: 8 }} onClick={() => setBand(null)}>limpar</button> : null}
          </p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setModalOpen(true)}>+ Novo grupo</button>
      </div>

      <div className={styles.gtop}>
        <div className="panel">
          <div className="ph"><h3>Distribuição de saúde</h3></div>
          <div className="donutwrap">
            <ConicDonut
              segments={[
                { value: counts.healthy, color: BAND_COLOR.healthy },
                { value: counts.attention, color: BAND_COLOR.attention },
                { value: counts.risk, color: BAND_COLOR.risk },
              ]}
            >
              <b>{health.length}</b>
              <span>grupos</span>
            </ConicDonut>
          </div>
          <div className="leg">
            <span style={{ cursor: "pointer" }} onClick={() => setBand(band === "healthy" ? null : "healthy")}><i style={{ background: BAND_COLOR.healthy }} />Saudável · {counts.healthy}</span>
            <span style={{ cursor: "pointer" }} onClick={() => setBand(band === "attention" ? null : "attention")}><i style={{ background: BAND_COLOR.attention }} />Atenção · {counts.attention}</span>
            <span style={{ cursor: "pointer" }} onClick={() => setBand(band === "risk" ? null : "risk")}><i style={{ background: BAND_COLOR.risk }} />Em risco · {counts.risk}</span>
          </div>
        </div>

        <div className={styles.gcards}>
          {cards.length === 0 ? (
            <div className="empty">Nenhum grupo aqui. Crie o primeiro.</div>
          ) : (
            cards.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className={styles.gcard}>
                <div className={styles.gcTop}>
                  <span className={styles.gcName}>{g.name}</span>
                  <span className={`hb ${g.band}`} style={{ marginLeft: "auto" }}>{g.rate}%</span>
                </div>
                <div className={styles.gcSub}>{g.leader || "sem líder"} · {g.count} membros</div>
                <div className="gbar"><i className={g.band} style={{ width: `${g.rate}%` }} /></div>
                <div className={styles.gcFoot}>
                  {g.acc} em dia · {g.count - g.acc} sinalizados
                  {g.newMembers > 0 ? ` · ${g.newMembers} novo${g.newMembers > 1 ? "s" : ""}` : ""}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {modalOpen ? (
        <NewGroupModal members={members} campuses={campuses} activeCampus={activeCampus} onClose={() => setModalOpen(false)} />
      ) : null}
    </>
  );
}
