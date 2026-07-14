"use client";

import { useMemo, useState } from "react";
import { initials } from "@/lib/utils/date";
import {
  prayerCloudData,
  prayerMatch,
  ansLeft,
  PRIVACY_LABELS,
  type PrayerRequest,
  type CloudFilter,
} from "../domain";
import { prayForAction, markAnsweredAction, restorePrayerAction } from "../actions";
import { PrayerCloud } from "./PrayerCloud";
import { PrayerModal } from "./PrayerModal";
import styles from "../prayer.module.css";

export function PrayerBoard({ prayers, authorDefault }: { prayers: PrayerRequest[]; authorDefault: string }) {
  const [filter, setFilter] = useState<CloudFilter | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const total = prayers.length;
  const ans = prayers.filter((p) => p.answered).length;
  const rate = total ? Math.round((ans / total) * 100) : 0;
  const cloud = useMemo(() => prayerCloudData(prayers), [prayers]);

  const list = useMemo(
    () =>
      prayers
        .filter((p) => prayerMatch(p, filter) && (showAnswered || !p.answered))
        .sort((a, b) => Number(a.answered) - Number(b.answered) || b.date.localeCompare(a.date)),
    [prayers, filter, showAnswered],
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 className="page">Mural de Oração</h1>
          <p className="sub" style={{ margin: 0 }}>Todo pedido visto, todo pedido acompanhado.</p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setModalOpen(true)}>+ Pedido</button>
      </div>

      <div className="cards" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="k">Total de pedidos</div><div className="v">{total}</div></div>
        <div className="stat"><div className="k">Respondidas</div><div className="v pos">{ans}</div></div>
        <div className="stat"><div className="k">Taxa de resposta</div><div className="v">{rate}%</div></div>
        <div className="stat"><div className="k">Aguardando</div><div className="v">{total - ans}</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="ph">
          <h3>Foco de Oração</h3>
          <div className={styles.cloudleg}>
            <span><i className={styles.lgName} />Nomes</span>
            <span><i className={styles.lgTopic} />Temas</span>
            <span><i className={styles.lgGroup} />Grupos</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span className="muted">O que a comunidade está carregando</span>
            {filter ? <button className="btn ghost sm" onClick={() => setFilter(null)}>Limpar filtro</button> : null}
          </div>
        </div>
        <PrayerCloud words={cloud} filter={filter} onSelect={setFilter} />
      </div>

      <div className={styles.prbar}>
        <span className="muted">{list.length} pedido(s)</span>
        <button className="link" style={{ marginLeft: "auto" }} onClick={() => setShowAnswered((v) => !v)}>
          {showAnswered ? "Ocultar respondidas" : `Mostrar respondidas (${ans})`}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty">Nenhum pedido com esse filtro.</div>
      ) : (
        list.map((p) => (
          <div key={p.id} className={`${styles.pray}${p.answered ? " " + styles.prayAnswered : ""}`}>
            <div className={styles.ph2}>
              <div className={`av${p.answered ? "" : " c"}`}>{initials(p.author)}</div>
              <span className={styles.who}>{p.author}</span>
              <span className={styles.pv}>
                {PRIVACY_LABELS[p.privacy]}{p.group ? " · " + p.group : ""}
              </span>
              {p.answered ? <span className={styles.answeredtag}>Respondida</span> : null}
            </div>
            <div className={styles.rx}>
              {p.title ? <b>{p.title}</b> : null}
              {p.title ? " · " : ""}
              {p.request}
            </div>
            {p.topics.length ? (
              <div className={styles.ptopics}>
                {p.topics.map((t) => (
                  <span key={t} className={styles.ptag}>{t}</span>
                ))}
              </div>
            ) : null}
            <div className={styles.pa}>
              <form action={prayForAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn ghost sm" type="submit">Orando ({p.praying})</button>
              </form>
              {p.answered ? (
                <>
                  <form action={restorePrayerAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="link" type="submit">Recolocar no mural</button>
                  </form>
                  <span className="muted" style={{ marginLeft: "auto" }}>{ansLeft(p)}</span>
                </>
              ) : (
                <form action={markAnsweredAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="link" type="submit">Marcar como respondida</button>
                </form>
              )}
            </div>
          </div>
        ))
      )}

      {modalOpen ? <PrayerModal authorDefault={authorDefault} onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}
