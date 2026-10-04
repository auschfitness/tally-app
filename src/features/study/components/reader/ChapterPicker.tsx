"use client";

// "João 1 ▾": popover ancorado no título com busca de livro, grade de capítulos e 3
// recentes. Substitui uma coluna fixa de livros (usada uma vez por sessão, não merece
// espaço permanente).
import { useEffect, useMemo, useRef, useState } from "react";
import { BOOKS, normToken } from "@/lib/bible/books";
import { RECENT_KEY, chapterCount, chapterLabel, pushRecent, type ChapterRef } from "../../reader";
import { UiIcon } from "@/components/shared/UiIcon";
import { ChevronDown } from "lucide-react";
import styles from "./reader.module.css";

function readRecent(): ChapterRef[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as ChapterRef[]).filter((r) => typeof r.book === "string" && typeof r.chapter === "number") : [];
  } catch {
    return [];
  }
}

export function ChapterPicker({ current, onPick }: { current: ChapterRef; onPick: (r: ChapterRef) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [book, setBook] = useState(current.book);
  const [recent, setRecent] = useState<ChapterRef[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = pushRecent(readRecent(), current);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("tally:recent")); // o menu lateral atualiza a lista
    } catch {
      /* armazenamento bloqueado: recentes só nesta visita */
    }
  }, [current]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent): void {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Ao abrir, a lista já mostra o livro aberto (não começa sempre em Gênesis).
  useEffect(() => {
    const list = open ? boxRef.current?.querySelector<HTMLElement>(`.${styles.pickBooks}`) : null;
    const on = list?.querySelector<HTMLElement>("[aria-current]");
    if (list && on) list.scrollTop += on.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 2; // só a lista rola, não a página
  }, [open]);

  const books = useMemo(() => {
    const t = normToken(q);
    return t ? BOOKS.filter((b) => normToken(b.pt).includes(t) || b.abbr.some((a) => normToken(a) === t)) : BOOKS;
  }, [q]);

  function pick(r: ChapterRef): void {
    setOpen(false);
    setQ("");
    onPick(r);
  }

  return (
    <div className={styles.pickWrap} ref={boxRef}>
      <button type="button" className={styles.pickBtn} aria-expanded={open} onClick={() => { setBook(current.book); setOpen((o) => !o); }}>
        {chapterLabel(current)} <UiIcon icon={ChevronDown} />
      </button>
      {open ? (
        <div className={styles.picker} role="dialog" aria-label="Escolher capítulo">
          <input className={styles.pickSearch} placeholder="Buscar livro…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className={styles.pickCols}>
            <ul className={styles.pickBooks}>
              {books.map((b) => (
                <li key={b.code}>
                  <button type="button" className={b.code === book ? styles.pickOn : undefined} aria-current={b.code === book ? "true" : undefined} onClick={() => setBook(b.code)}>{b.pt}</button>
                </li>
              ))}
            </ul>
            <div className={styles.pickGrid}>
              {Array.from({ length: chapterCount(book) }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={book === current.book && n === current.chapter ? styles.pickOn : undefined} aria-current={book === current.book && n === current.chapter ? "true" : undefined} onClick={() => pick({ book, chapter: n })}>{n}</button>
              ))}
            </div>
          </div>
          {recent.length > 1 ? (
            <div className={styles.pickRecent}>
              <span>Recentes</span>
              {recent.slice(1).map((r) => (
                <button key={`${r.book}-${r.chapter}`} type="button" className="link" onClick={() => pick(r)}>{chapterLabel(r)}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
