"use client";

// Página Notas (spec 10 §5): as notas do texto bíblico e as soltas juntas. Busca +
// segmentado "Por data | Por livro"; com texto na busca vira uma lista única.
import { useMemo, useState } from "react";
import Link from "next/link";
import { groupNotesByBook, groupNotesByDate, noteDate, searchNotes, type NoteItem } from "../domain";
import { NoteSheet } from "./NoteSheet";
import { TrashLink } from "./SermonLibrary";
import styles from "../study.module.css";

type View = "data" | "livro";
const VIEWS: [View, string][] = [["data", "Por data"], ["livro", "Por livro"]];

export function NotesLibrary({ items }: { items: NoteItem[] }) {
  const [view, setView] = useState<View>("data");
  const [q, setQ] = useState("");
  // undefined = fechada; null = nova nota; NoteItem = edição de nota solta.
  const [sheet, setSheet] = useState<NoteItem | null | undefined>(undefined);
  const now = useMemo(() => new Date(), []);
  const searching = q.trim().length > 0;
  const results = searching ? searchNotes(items, q) : [];
  const row = (n: NoteItem) => <NoteRow key={n.key} n={n} now={now} onOpen={() => setSheet(n)} />;

  return (
    <div className={styles.lib}>
      <div className={styles.libHead}>
        <h1 className="page">Notas</h1>
        <button type="button" className={styles.primary} onClick={() => setSheet(null)}>Nova nota</button>
      </div>

      {items.length === 0 ? (
        <div className={styles.libEmpty}>
          <p>Suas notas ficam aqui. Abra a Bíblia e toque em Notas para criar a primeira.</p>
          <Link href="/study/bible" className={styles.primary}>Abrir a Bíblia</Link>
        </div>
      ) : (
        <>
          <div className={styles.libBar}>
            <input
              className={styles.libSearch}
              type="search"
              placeholder="Buscar nas notas"
              aria-label="Buscar nas notas"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {searching ? null : (
              <div className={styles.segmented} role="group" aria-label="Visão">
                {VIEWS.map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {searching ? (
            <>
              <div className={styles.libCount}>{results.length} {results.length === 1 ? "resultado" : "resultados"}</div>
              {results.length === 0 ? <div className="empty">Nada encontrado para “{q.trim()}”.</div> : results.map(row)}
            </>
          ) : view === "data" ? (
            groupNotesByDate(items, now).map((g) => (
              <section key={g.label}>
                <h2 className={styles.libSec}>{g.label}</h2>
                {g.items.map(row)}
              </section>
            ))
          ) : (
            groupNotesByBook(items).map((g) => (
              <section key={g.code ?? "none"}>
                <h2 className={styles.libSec}>
                  {g.label} <span className={styles.nCount}>{g.items.length} {g.items.length === 1 ? "nota" : "notas"}</span>
                </h2>
                {g.items.map(row)}
              </section>
            ))
          )}
        </>
      )}
      <TrashLink />
      {sheet !== undefined ? <NoteSheet note={sheet} onClose={() => setSheet(undefined)} /> : null}
    </div>
  );
}

// Nota do texto: link para o capítulo. Nota solta: abre a folha de edição.
function NoteRow({ n, now, onOpen }: { n: NoteItem; now: Date; onOpen: () => void }) {
  const inner = (
    <>
      <span className={styles.nRef}>{n.label}</span>
      <span className={styles.nDate}>{noteDate(n.at, now)}</span>
      {n.body.trim() ? <span className={styles.nText}>{n.body}</span> : null}
    </>
  );
  return n.kind === "text" && n.book ? (
    <Link href={`/study/bible/${n.book}/${n.chapter ?? 1}`} className={styles.nRow}>{inner}</Link>
  ) : (
    <button type="button" className={styles.nRow} onClick={onOpen}>{inner}</button>
  );
}
