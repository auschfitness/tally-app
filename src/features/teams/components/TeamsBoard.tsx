"use client";

// Lista de Times: ministérios como seções (cada um com seus times) e depois os
// times sem ministério. Dona dos botões "novo" e dos modais de ministério/time.
import { useState } from "react";
import Link from "next/link";
import { TEAM_STATUS_BAND, TEAM_STATUS_LBL, MIN_STATUS_LBL } from "../domain";
import type { Ministry, Team, TeamMember } from "../types";
import type { PersonOption } from "./types";
import { TeamModal } from "./TeamModal";
import { MinistryModal } from "./MinistryModal";
import styles from "../teams.module.css";

type ModalState =
  | { kind: "none" }
  | { kind: "newTeam" }
  | { kind: "newMinistry" }
  | { kind: "editMinistry"; ministry: Ministry };

export function TeamsBoard({
  ministries,
  teams,
  members,
  nameByStick,
  people,
  campuses,
  activeCampus,
}: {
  ministries: Ministry[];
  teams: Team[];
  members: TeamMember[];
  nameByStick: Record<string, string>;
  people: PersonOption[];
  campuses: string[];
  activeCampus: string;
}) {
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  function TeamCard({ t }: { t: Team }) {
    const n = members.filter((m) => m.team_id === t.id && m.status !== "inactive").length;
    const lead = t.leader_id ? nameByStick[t.leader_id] ?? "" : "";
    return (
      <Link href={`/teams/${t.id}`} className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>{t.name || "(sem nome)"}</span>
          <span className={`hb ${TEAM_STATUS_BAND[t.status] || "attention"}`} style={{ marginLeft: "auto" }}>
            {TEAM_STATUS_LBL[t.status] || t.status}
          </span>
        </div>
        <div className={styles.cardSub}>{n} servindo{lead ? ` · líder: ${lead}` : " · sem líder"}</div>
        {t.description ? <div className={styles.cardFoot}>{t.description}</div> : null}
      </Link>
    );
  }

  const loose = teams.filter((t) => !t.ministry_id);
  const isEmpty = teams.length === 0 && ministries.length === 0;

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h1 className="page">Times</h1>
          <p className="sub" style={{ margin: 0 }}>
            Quem serve e onde. Times são onde a pessoa serve; ministérios agrupam times. Consciência operacional, não nota.
          </p>
        </div>
        <Link href="/teams/schedule" className="btn ghost" style={{ marginLeft: "auto" }}>Escala</Link>
        <button className="btn ghost" onClick={() => setModal({ kind: "newMinistry" })}>+ Ministério</button>
        <button className="btn" onClick={() => setModal({ kind: "newTeam" })}>+ Novo time</button>
      </div>

      {isEmpty ? (
        <div className="empty">Nenhum time ainda. Crie um ministério (ex.: Louvor) e os times que servem nele, ou um time direto.</div>
      ) : (
        <>
          {ministries.map((m) => {
            const mine = teams.filter((t) => t.ministry_id === m.id);
            return (
              <div key={m.id}>
                <div className={styles.sectionHead}>
                  <Link href={`/teams/ministry/${m.id}`}><h3>{m.name}</h3></Link>
                  <span className={`hb ${m.status === "active" ? "healthy" : "attention"}`}>{MIN_STATUS_LBL[m.status] || m.status}</span>
                  <Link href={`/teams/ministry/${m.id}`} className="link" style={{ marginLeft: "auto" }}>painel</Link>
                  <button className="link" onClick={() => setModal({ kind: "editMinistry", ministry: m })}>editar</button>
                </div>
                {mine.length ? (
                  <div className={styles.cards} style={{ marginBottom: 16 }}>{mine.map((t) => <TeamCard key={t.id} t={t} />)}</div>
                ) : (
                  <div className="empty" style={{ marginBottom: 16 }}>Sem times neste ministério ainda.</div>
                )}
              </div>
            );
          })}
          {loose.length ? (
            <>
              <div className={styles.sectionHead}>
                <h3 className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Sem ministério</h3>
              </div>
              <div className={styles.cards}>{loose.map((t) => <TeamCard key={t.id} t={t} />)}</div>
            </>
          ) : null}
        </>
      )}

      {modal.kind === "newTeam" ? (
        <TeamModal ministries={ministries} people={people} campuses={campuses} activeCampus={activeCampus} onClose={() => setModal({ kind: "none" })} />
      ) : null}
      {modal.kind === "newMinistry" ? (
        <MinistryModal people={people} activeCampus={activeCampus} onClose={() => setModal({ kind: "none" })} />
      ) : null}
      {modal.kind === "editMinistry" ? (
        <MinistryModal ministry={modal.ministry} people={people} activeCampus={activeCampus} onClose={() => setModal({ kind: "none" })} />
      ) : null}
    </>
  );
}
