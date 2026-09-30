"use client";

// Tela de leitura (spec 07): barra, texto, chave Interlinear, balão, modo Original.
// Remonta a cada capítulo; a área de trabalho mora no ReaderWorkspace (layout) e
// sobrevive à troca. Este componente só publica o capítulo e pede abas.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { DEFAULT_SECTION, buildKeywordBlock } from "../../domain";
import {
  LAST_READ_KEY,
  adjacentChapter,
  chapterLabel,
  glossOf,
  groupOriginal,
  type ChapterRef,
  type LexShort,
  type OrigWord,
  type ReaderVerse,
  type Span,
  type WsTab,
} from "../../reader";
import { ChapterPicker } from "./ChapterPicker";
import { useWorkspace, type EditorData } from "./ReaderWorkspace";
import { WordPopover, popoverAt, type PopoverState } from "./WordPopover";
import styles from "./reader.module.css";

type Mode = "bible" | "original";
const TOGGLE_KEY = "tally.reader.interlinear";

export function ReaderView({
  refNow,
  verses,
  tagged,
  original,
  lex,
  textError,
  editor,
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
  const prev = useMemo(() => adjacentChapter(refNow, -1), [refNow]);
  const next = useMemo(() => adjacentChapter(refNow, 1), [refNow]);
  const [mode, setMode] = useState<Mode>("bible");
  const [interlinear, setInterlinear] = useState(false);
  const [pop, setPop] = useState<PopoverState | null>(null);
  // Foco: o balão foca "Ver detalhes" ao abrir; ao fechar, o foco volta a quem o abriu.
  const opener = useRef<HTMLElement | null>(null);
  const closePop = useCallback((): void => {
    setPop(null);
    opener.current?.focus({ preventScroll: true });
  }, []);
  function openPop(el: HTMLElement, strong: string, verse: number, key: string): void {
    opener.current = el;
    setPop(popoverAt(el.getBoundingClientRect(), strong, verse, key));
  }
  const wsApi = useWorkspace();
  const { publish, sermonOpen, sendBlock } = wsApi;
  function open(t: WsTab): void {
    setPop(null);
    wsApi.open(t);
  }

  useEffect(() => {
    publish(refNow, lex, editor);
  }, [publish, refNow, lex, editor]);

  useEffect(() => {
    try {
      setInterlinear(localStorage.getItem(TOGGLE_KEY) === "1");
    } catch {
      /* sem armazenamento: começa desligada */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(refNow));
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
  }, [refNow]);

  function toggleInterlinear(): void {
    setPop(null);
    setInterlinear((v) => {
      try {
        localStorage.setItem(TOGGLE_KEY, v ? "0" : "1");
      } catch {
        /* preferência só nesta visita */
      }
      return !v;
    });
  }

  const go = useCallback((r: ChapterRef | null): void => {
    if (r) router.push(`/study/bible/${r.book}/${r.chapter}`);
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const t = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return; // Alt+← é do navegador
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (t?.closest('[data-testid="workspace"]')) return; // setas dentro da área de trabalho são dela
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next]);

  const showWords = tagged && interlinear && mode === "bible";
  const lexCredit = `léxico STEPBible (CC BY 4.0)${Object.values(lex).some((l) => l.gloss_pt) ? ", tradução Tally" : ""}`;

  function renderSpan(s: Span, verse: number, i: number): ReactNode {
    const strong = s.strong;
    if (!showWords || !strong) return <span key={i}>{s.text}</span>;
    const key = `${verse}:${i}`;
    return (
      <button
        key={i}
        type="button"
        data-strong={strong}
        className={`${styles.word} ${pop?.key === key ? styles.hit : ""}`}
        onClick={(e) => openPop(e.currentTarget, strong, verse, key)}
      >
        {s.text}
      </button>
    );
  }

  const byVerse = mode === "original" ? groupOriginal(original) : [];

  function sendToSermon(strong: string, verse: number): void {
    const l = lex[strong];
    sendBlock(`${chapterLabel(refNow)}:${verse} · ` + buildKeywordBlock({ lemma: l?.lemma || strong, strong, meaning: glossOf(l), occurrences: null }), DEFAULT_SECTION);
    open({ kind: "sermon" });
  }

  return (
    <div className={styles.main}>
      <div className={styles.bar}>
        <ChapterPicker current={refNow} onPick={go} />
        <span className={styles.sep} aria-hidden />
        <Select compact value={mode} aria-label="Modo de leitura" onChange={(e) => { setPop(null); setMode(e.target.value === "original" ? "original" : "bible"); }}>
          <option value="bible">Bíblia</option>
          <option value="original">Original</option>
        </Select>
        {tagged && mode === "bible" ? (
          <label className={styles.toggle}>
            <input type="checkbox" role="switch" checked={interlinear} onChange={toggleInterlinear} data-testid="interlinear-toggle" />
            Interlinear
          </label>
        ) : null}
      </div>

      {mode === "bible" ? (
        <article className={styles.text} lang="pt-BR" data-testid="reader-text" tabIndex={-1}>
          <div className={styles.eyebrow}>{chapterLabel(refNow)} · Bíblia Livre</div>
          {textError ? <p className={styles.muted}>{textError}</p> : null}
          <p className={styles.para}>
            <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span>
            {verses.map((v) => (
              <span key={v.n}>
                <button type="button" className={styles.vnum} aria-label={`Estudar ${chapterLabel(refNow)}:${v.n}`} onClick={() => open({ kind: "verse", book: refNow.book, chapter: refNow.chapter, verse: v.n })}>{v.n}</button>
                {v.spans.map((s, i) => renderSpan(s, v.n, i))}{" "}
              </span>
            ))}
          </p>
          <p className={styles.attrib}>Bíblia Livre (BLIVRE), CC BY 4.0{showWords ? ` · ${lexCredit}` : ""}</p>
        </article>
      ) : (
        <article className={styles.text} data-testid="reader-original" tabIndex={-1}>
          <div className={styles.eyebrow}>{chapterLabel(refNow)} · texto original</div>
          {byVerse.length === 0 ? <p className={styles.muted}>O texto original deste capítulo ainda não está no Tally.</p> : null}
          {byVerse.map((v) => (
            <div key={v.n} className={styles.il} dir={v.words[0]?.lang === "hbo" ? "rtl" : "ltr"}>
              <span className={styles.ilVerse}>{v.n}</span>
              {v.words.map((w) => {
                const strong = w.strong;
                const key = `o${v.n}:${w.position}`;
                return (
                  <button
                    key={w.position}
                    type="button"
                    data-strong={strong ?? undefined}
                    disabled={!strong}
                    className={`${styles.ilw} ${pop?.key === key ? styles.hit : ""}`}
                    onClick={(e) => { if (strong) openPop(e.currentTarget, strong, v.n, key); }}
                  >
                    <span className={styles.ilSurface} lang={w.lang === "hbo" ? "he" : "grc"}>{w.surface}</span>
                    <span className={styles.ilTr}>{w.translit}</span>
                    <span className={styles.ilGloss}>{strong ? glossOf(lex[strong]) : ""}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <p className={styles.attrib}>Texto original: STEPBible (CC BY 4.0) · {lexCredit}</p>
        </article>
      )}

      <nav className={styles.chapNav} aria-label="Capítulos">
        {prev ? <button type="button" className="link" onClick={() => go(prev)}>‹ {chapterLabel(prev)}</button> : <span />}
        {next ? <button type="button" className="link" onClick={() => go(next)}>{chapterLabel(next)} ›</button> : <span />}
      </nav>

      {pop ? (
        <WordPopover state={pop} lex={lex} canSendToSermon={sermonOpen} onDetails={() => open({ kind: "word", strong: pop.strong })} onNote={() => { setPop(null); wsApi.openNotes({ book: refNow.book, chapter: refNow.chapter, verse: pop.verse }); }} onSermon={() => sendToSermon(pop.strong, pop.verse)} onClose={closePop} />
      ) : null}
    </div>
  );
}
