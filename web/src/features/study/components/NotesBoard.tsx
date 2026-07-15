"use client";

// Notas de estudo (Client): lista de cards + editor em modal. Vínculos leves
// (sermão/série/escritura/tópico) — a nota não é ilha. Escopo pessoal/compartilhada.
import { useMemo, useState } from "react";
import { NOTE_SCOPE_LBL } from "../domain";
import type { Series, StudyNote } from "../types";
import { NoteModal, type LinkOption } from "./NoteModal";
import styles from "../study.module.css";

export function NotesBoard({
  notes,
  sermons,
  series,
}: {
  notes: StudyNote[];
  sermons: LinkOption[];
  series: Series[];
}) {
  const [editing, setEditing] = useState<StudyNote | null>(null);
  const [creating, setCreating] = useState(false);
  const sermonTitle = useMemo(() => new Map(sermons.map((s) => [s.id, s.title])), [sermons]);
  const seriesTitle = useMemo(() => new Map(series.map((s) => [s.id, s.title])), [series]);
  const seriesOpts: LinkOption[] = series.map((s) => ({ id: s.id, title: s.title }));

  function links(n: StudyNote): string {
    const bits: string[] = [];
    if (n.sermon_id && sermonTitle.has(n.sermon_id)) bits.push("Sermão: " + (sermonTitle.get(n.sermon_id) || "(sem título)"));
    if (n.series_id && seriesTitle.has(n.series_id)) bits.push("Série: " + (seriesTitle.get(n.series_id) || "(sem título)"));
    if (n.scripture_ref) bits.push(n.scripture_ref);
    if (n.topic) bits.push(n.topic);
    return bits.join(" · ");
  }

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h1 className="page">Estudo</h1>
          <p className="sub" style={{ margin: 0 }}>Guarde uma ideia, um estudo ou uma observação — com vínculos leves ao ensino.</p>
        </div>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setCreating(true)}>+ Nova nota</button>
      </div>

      {notes.length === 0 ? (
        <div className="empty">Nenhuma nota ainda. Guarde uma ideia, um estudo ou uma observação em “+ Nova nota”.</div>
      ) : (
        <div className={styles.cards}>
          {notes.map((n) => {
            let preview = (n.content || "").trim();
            if (preview.length > 220) preview = preview.slice(0, 220) + "…";
            const meta = links(n);
            return (
              <button key={n.id} className={styles.card} style={{ textAlign: "left" }} onClick={() => setEditing(n)}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{n.title || "(sem título)"}</span>
                  <span className={`hb ${n.scope === "shared" ? "healthy" : "attention"}`} style={{ marginLeft: "auto" }}>{NOTE_SCOPE_LBL[n.scope] || "Pessoal"}</span>
                </div>
                {preview ? <div className={styles.cardFoot} style={{ whiteSpace: "pre-wrap" }}>{preview}</div> : null}
                {meta ? <div className="meta" style={{ marginTop: 6 }}>{meta}</div> : null}
                {n.tags.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {n.tags.map((t) => <span key={t} className="chip" style={{ background: "var(--surface-2, #f1f3f8)" }}>{t}</span>)}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {creating ? <NoteModal sermons={sermons} series={seriesOpts} onClose={() => setCreating(false)} /> : null}
      {editing ? <NoteModal note={editing} sermons={sermons} series={seriesOpts} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
