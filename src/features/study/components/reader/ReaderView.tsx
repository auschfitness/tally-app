"use client";

// Tela de leitura (spec 07). Esta versão: barra, texto do capítulo, anterior/próximo e
// teclado. A Task 5 acrescenta chave Interlinear, balão e modo Original; as Tasks 6-8,
// a área de trabalho.
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Sermon, Series } from "../../types";
import { LAST_READ_KEY, adjacentChapter, chapterLabel, type ChapterRef, type LexShort, type OrigWord, type ReaderVerse } from "../../reader";
import { ChapterPicker } from "./ChapterPicker";
import styles from "./reader.module.css";

export interface EditorData {
  sermons: Sermon[];
  series: Series[];
  services: { id: string; name: string }[];
  campuses: string[];
  activeCampus: string;
  locale: string;
}

export function ReaderView({
  refNow,
  verses,
  textError,
}: {
  refNow: ChapterRef;
  verses: ReaderVerse[];
  tagged: boolean;
  original: OrigWord[];
  lex: Record<string, LexShort>;
  textError: string;
  editor: EditorData;
}) {
  const router = useRouter();
  const prev = adjacentChapter(refNow, -1);
  const next = adjacentChapter(refNow, 1);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(refNow));
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
  }, [refNow]);

  const go = useCallback((r: ChapterRef | null): void => {
    if (r) router.push(`/study/bible/${r.book}/${r.chapter}`);
  }, [router]);

  // ← → trocam de capítulo. Sem animação (ação de teclado, repetida). Ignora digitação.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next]);

  return (
    <div className={styles.reader}>
      <div className={styles.main}>
        <div className={styles.bar}>
          <ChapterPicker current={refNow} onPick={go} />
        </div>
        <article className={styles.text} lang="pt-BR" data-testid="reader-text">
          <div className={styles.eyebrow}>{chapterLabel(refNow)} · Bíblia Livre</div>
          {textError ? <p className={styles.muted}>{textError}</p> : null}
          <p className={styles.para}>
            <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span>
            {verses.map((v) => (
              <span key={v.n}>
                <sup className={styles.vnumPlain}>{v.n}</sup>
                {v.spans.map((s, i) => <span key={i}>{s.text}</span>)}{" "}
              </span>
            ))}
          </p>
          <p className={styles.attrib}>Bíblia Livre (BLIVRE), CC BY 4.0</p>
        </article>
        <nav className={styles.chapNav} aria-label="Capítulos">
          {prev ? <button type="button" className="link" onClick={() => go(prev)}>‹ {chapterLabel(prev)}</button> : <span />}
          {next ? <button type="button" className="link" onClick={() => go(next)}>{chapterLabel(next)} ›</button> : <span />}
        </nav>
      </div>
    </div>
  );
}
