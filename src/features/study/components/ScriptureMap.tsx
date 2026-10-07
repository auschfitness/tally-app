"use client";

// Mapa de Escrituras (Client, embutido em Sermões > Por livro): cobertura dos 66 livros por uso real em sermões. Cor
// ∝ nº de sermões distintos. Clicar num livro mostra os sermões que o usaram. Só dado
// real (o mapa se preenche conforme sermões ganham passagens).
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BOOKS, bookName } from "@/lib/bible/books";
import { coverage } from "../domain";
import type { Scripture } from "../types";
import { brDate } from "@/lib/utils/date";
import styles from "../study.module.css";

interface SermonLite {
  id: string;
  title: string;
  sermon_date: string;
}

export function ScriptureMap({ scriptures, sermons }: { scriptures: Scripture[]; sermons: SermonLite[] }) {
  const [book, setBook] = useState<string | null>(null);
  const cov = coverage(scriptures);
  const total = Object.keys(cov.count).length;
  const sermonById = new Map(sermons.map((s) => [s.id, s]));

  let detail: ReactNode = null;
  if (book) {
    const rows = scriptures.filter((x) => x.book === book);
    const bySermon = new Map<string, string[]>();
    for (const x of rows) (bySermon.get(x.sermon_id) ?? bySermon.set(x.sermon_id, []).get(x.sermon_id)!).push(x.reference);
    const items = [...bySermon.entries()]
      .map(([id, refs]) => ({ s: sermonById.get(id), refs }))
      .filter((x): x is { s: SermonLite; refs: string[] } => !!x.s);
    detail = (
      <div className={`panel ${styles.smapDetail}`}>
        <div className="ph"><h3>{bookName(book)}</h3><span className={`muted ${styles.smapCount}`}>{items.length} {items.length === 1 ? "sermão" : "sermões"}</span></div>
        {items.length === 0 ? (
          <div className={styles.libEmpty}>Nenhum sermão usou este livro ainda.</div>
        ) : (
          items.map(({ s, refs }) => (
            <Link key={s.id} href={`/study/sermon/${s.id}`} className={`li ${styles.smapItem}`}>
              <div><b>{s.title || "(sem título)"}</b>{s.sermon_date ? <span className="muted"> · {brDate(s.sermon_date)}</span> : null}</div>
              <div className="meta">{refs.join(" · ")}</div>
            </Link>
          ))
        )}
      </div>
    );
  }

  return (
    <>
      <p className={`sub ${styles.smapSub}`}>Quais livros já foram pregados e com que intensidade. Dados reais dos sermões.</p>

      {total === 0 ? (
        <div className={styles.libEmpty}>Nenhuma passagem registrada ainda. O mapa se preenche conforme você escreve sermões com referências.</div>
      ) : (
        <>
          <div className={styles.smap}>
            {BOOKS.map((b) => {
              const n = cov.count[b.code] ?? 0;
              const level = n ? Math.min(4, Math.max(1, Math.ceil((4 * n) / (cov.max || 1)))) : 0;
              return (
                <button
                  key={b.code}
                  className={styles.smapCell}
                  data-level={level}
                  aria-pressed={book === b.code}
                  title={`${b.pt}${n ? ` · ${n} ${n === 1 ? "sermão" : "sermões"}` : " · sem uso"}`}
                  onClick={() => setBook(book === b.code ? null : b.code)}
                >
                  {b.pt}
                  {n ? <span className={styles.smapN}>{n}</span> : null}
                </button>
              );
            })}
          </div>
          {detail}
        </>
      )}
    </>
  );
}
