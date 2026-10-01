"use client";

// Painel "Passagens" do editor (spec 10, seção 4): as escrituras reconhecidas no sermão,
// a principal primeiro. Cada linha abre o texto e as notas do texto daquela passagem.
// Entra e sai pela direita (celular: folha de baixo), sem véu.
import Link from "next/link";
import { useEffect, useState } from "react";
import { listTextNotesAction } from "../actions";
import { noteOverlapsPassage, type SectionKey } from "../domain";
import type { TextNote } from "../types";
import { buildReference, refKey, type ScriptureRef } from "@/lib/bible/parse";
import { fetchPassage, type PassageResult } from "@/lib/bible/source";
import { usfmToOsis } from "@/lib/bible/osis";
import { AddToSermon } from "./AddToSermon";
import styles from "../study.module.css";

function PassageRow({
  r,
  main,
  active,
  onAdd,
}: {
  r: ScriptureRef;
  main: boolean;
  active: boolean;
  onAdd: (block: string, section: SectionKey) => void;
}) {
  const [open, setOpen] = useState(main);
  const [whole, setWhole] = useState(false);
  const [passage, setPassage] = useState<PassageResult | null>(null);
  const [notes, setNotes] = useState<TextNote[]>([]);
  const osis = usfmToOsis(r.book);
  const live = open && active;
  // `r` é recriado a cada render do editor; a chave estável evita buscar de novo a cada tecla.
  const key = refKey(r);

  // Pequena espera: a principal muda a cada tecla enquanto o pastor digita.
  useEffect(() => {
    if (!live) return;
    let alive = true;
    setPassage(null);
    const t = window.setTimeout(() => {
      const q = whole ? { book: r.book, chapter: r.chapter, verse_start: null, verse_end: null } : r;
      void fetchPassage(q).then((p) => alive && setPassage(p));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, whole, key]);

  useEffect(() => {
    if (!live || !osis) return;
    let alive = true;
    const t = window.setTimeout(() => {
      void listTextNotesAction(osis, r.chapter).then((res) => {
        if (alive) setNotes(res.success ? res.data.filter((n) => noteOverlapsPassage(n, r)) : []);
      });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, osis, key]);

  return (
    <li className={styles.pvRow}>
      <button type="button" className={styles.pvHead} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={styles.pvChev} aria-hidden>›</span>
        <span>{r.reference}</span>
        {main ? <span className={styles.pvTag}>Principal</span> : null}
      </button>
      {open ? (
        <div className={styles.pvBody}>
          {passage === null ? (
            <p className={styles.pvMuted}>Carregando o texto…</p>
          ) : passage.ok ? (
            <>
              <p className={styles.pvText}>
                {passage.verses.map((v) => {
                  const vs = r.verse_start, ve = r.verse_end || r.verse_start;
                  const hot = whole && vs != null && ve != null && v.n >= vs && v.n <= ve;
                  return (
                    <span key={v.n} className={hot ? styles.pvHot : undefined}>
                      <sup>{v.n}</sup>{v.text}{" "}
                    </span>
                  );
                })}
              </p>
              <p className={styles.pvMuted}>{passage.translationName || passage.translationId}</p>
            </>
          ) : (
            <p className={styles.pvMuted}>{passage.error || "Não foi possível carregar o texto agora."}</p>
          )}
          <div className={styles.pvActs}>
            {r.verse_start != null ? (
              <button type="button" className={styles.secondary} onClick={() => setWhole((w) => !w)}>
                {whole ? "Só a passagem" : "Capítulo inteiro"}
              </button>
            ) : null}
            <Link className={styles.secondary} href={`/study/bible/${r.book}/${r.chapter}`}>Abrir na Bíblia</Link>
          </div>
          {notes.length ? (
            <>
              <h3 className={styles.pvNotesH}>Suas notas nesta passagem</h3>
              {notes.map((n) => (
                <div key={n.id} className={styles.pvNote}>
                  <span className={styles.pvNoteRef}>{buildReference(r.book, n.chapter, n.verse_start, n.verse_end)}</span>
                  <p>{n.body}</p>
                  <AddToSermon getBlock={() => n.body} onAdd={onAdd} label="Usar no sermão" />
                </div>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function PassagesPanel({
  open,
  refs,
  mainKey,
  onClose,
  onAdd,
}: {
  open: boolean;
  refs: ScriptureRef[];
  mainKey: string | null;
  onClose: () => void;
  onAdd: (block: string, section: SectionKey) => void;
}) {
  return (
    <aside id="passages-panel" className={`${styles.passPanel}${open ? " " + styles.passPanelOpen : ""}`} aria-label="Passagens">
      <div className={styles.passHead}>
        <h2>Passagens</h2>
        <button type="button" className={styles.edIcon} aria-label="Fechar painel" onClick={onClose}>×</button>
      </div>
      {refs.length === 0 ? (
        <p className={styles.passEmpty}>Escreva uma passagem (ex.: João 3:16) no sermão e ela aparece aqui.</p>
      ) : (
        <ul className={styles.pvList}>
          {refs.map((r) => (
            <PassageRow key={refKey(r)} r={r} main={refKey(r) === mainKey} active={open} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </aside>
  );
}
