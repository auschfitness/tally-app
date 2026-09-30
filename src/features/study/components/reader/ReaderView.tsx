"use client";

// Tela de leitura (spec 07): barra, texto, chave Interlinear, balão, modo Original.
// Área de trabalho em abas à direita (gaveta no celular).
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { bookName } from "@/lib/bible/books";
import type { Sermon, Series } from "../../types";
import {
  EMPTY_WS,
  LAST_READ_KEY,
  adjacentChapter,
  closeTab,
  openTab,
  tabKey,
  chapterLabel,
  glossOf,
  groupOriginal,
  type ChapterRef,
  type LexShort,
  type OrigWord,
  type ReaderVerse,
  type Span,
  type Workspace,
  type WsTab,
} from "../../reader";
import { BibleCompare } from "../BibleCompare";
import { ChapterPicker } from "./ChapterPicker";
import { NotesTab } from "./NotesTab";
import { WordTab } from "./WordTab";
import { WorkspacePane } from "./WorkspacePane";
import { WordPopover, popoverAt, type PopoverState } from "./WordPopover";
import styles from "./reader.module.css";

export interface EditorData {
  sermons: Sermon[];
  series: Series[];
  services: { id: string; name: string }[];
  campuses: string[];
  activeCampus: string;
  locale: string;
}

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
  const prev = adjacentChapter(refNow, -1);
  const next = adjacentChapter(refNow, 1);
  const [mode, setMode] = useState<Mode>("bible");
  const [interlinear, setInterlinear] = useState(false);
  const [pop, setPop] = useState<PopoverState | null>(null);
  const closePop = useCallback((): void => setPop(null), []);
  const [ws, setWs] = useState<Workspace>(EMPTY_WS);
  const [closing, setClosing] = useState(false);
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const open = useCallback((t: WsTab): void => {
    setPop(null);
    setClosing(false);
    setWs((w) => openTab(w, t));
  }, []);
  // Fechar tudo anima a saída (mesmo caminho da entrada) e só então desmonta.
  const closeAll = useCallback((): void => {
    setClosing(true);
    window.setTimeout(() => {
      setWs(EMPTY_WS);
      setClosing(false);
    }, 200);
  }, []);
  function closeOne(key: string): void {
    const nextWs = closeTab(ws, key);
    if (nextWs.tabs.length === 0) closeAll();
    else setWs(nextWs);
  }

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
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next]);

  const showWords = tagged && interlinear && mode === "bible";

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
        onClick={(e) => setPop(popoverAt(e.currentTarget.getBoundingClientRect(), strong, verse, key))}
      >
        {s.text}
      </button>
    );
  }

  const byVerse = mode === "original" ? groupOriginal(original) : [];

  function renderTab(t: WsTab): ReactNode {
    if (t.kind === "word") return <WordTab strong={t.strong} lex={lex} onGo={go} />;
    if (t.kind === "verse") {
      const r = { book: refNow.book, chapter: refNow.chapter, verse_start: t.verse, verse_end: null, reference: `${bookName(refNow.book)} ${refNow.chapter}:${t.verse}` };
      return <BibleCompare embedded initialRef={r} locale={editor.locale} onClose={() => closeOne(tabKey(t))} />;
    }
    if (t.kind === "notes") return <NotesTab refNow={refNow} verse={noteVerse} />;
    return null;
  }

  return (
    <div className={`${styles.reader} ${ws.tabs.length ? styles.withPane : ""}`}>
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
          <article className={styles.text} lang="pt-BR" data-testid="reader-text">
            <div className={styles.eyebrow}>{chapterLabel(refNow)} · Bíblia Livre</div>
            {textError ? <p className={styles.muted}>{textError}</p> : null}
            <p className={styles.para}>
              <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span>
              {verses.map((v) => (
                <span key={v.n}>
                  <button type="button" className={styles.vnum} aria-label={`Estudar ${chapterLabel(refNow)}:${v.n}`} onClick={() => open({ kind: "verse", verse: v.n })}>{v.n}</button>
                  {v.spans.map((s, i) => renderSpan(s, v.n, i))}{" "}
                </span>
              ))}
            </p>
            <p className={styles.attrib}>Bíblia Livre (BLIVRE), CC BY 4.0</p>
          </article>
        ) : (
          <article className={styles.text} data-testid="reader-original">
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
                      onClick={(e) => { if (strong) setPop(popoverAt(e.currentTarget.getBoundingClientRect(), strong, v.n, key)); }}
                    >
                      <span className={styles.ilSurface} lang={w.lang === "hbo" ? "he" : "grc"}>{w.surface}</span>
                      <span className={styles.ilTr}>{w.translit}</span>
                      <span className={styles.ilGloss}>{strong ? glossOf(lex[strong]) : ""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <p className={styles.attrib}>Texto original e léxico: STEPBible (CC BY 4.0)</p>
          </article>
        )}

        <nav className={styles.chapNav} aria-label="Capítulos">
          {prev ? <button type="button" className="link" onClick={() => go(prev)}>‹ {chapterLabel(prev)}</button> : <span />}
          {next ? <button type="button" className="link" onClick={() => go(next)}>{chapterLabel(next)} ›</button> : <span />}
        </nav>
      </div>

      {pop ? (
        <WordPopover state={pop} lex={lex} canSendToSermon={false} onDetails={() => open({ kind: "word", strong: pop.strong })} onNote={() => { setNoteVerse(pop.verse); open({ kind: "notes" }); }} onSermon={closePop} onClose={closePop} />
      ) : null}

      {ws.tabs.length ? (
        <WorkspacePane
          ws={ws}
          lex={lex}
          closing={closing}
          onActivate={(key) => setWs((w) => ({ ...w, active: key }))}
          onCloseTab={closeOne}
          onCloseAll={closeAll}
          renderTab={renderTab}
          addable={ws.tabs.some((t) => t.kind === "notes") ? [] : [{ kind: "notes", label: "Notas" }]}
          onAdd={(k) => { if (k === "notes") { setNoteVerse(null); open({ kind: "notes" }); } }}
          verseLabel={(v) => `${chapterLabel(refNow)}:${v}`}
        />
      ) : null}
    </div>
  );
}
