"use client";

// Tela de leitura (spec 07): barra, texto, chave Interlinear, modo Original. Tocar uma
// palavra abre direto a aba Palavra (sem balão, como no Raízes); a palavra tocada ganha
// contorno e as outras ocorrências do mesmo original no capítulo, um fundo leve.
// Com uma palavra aberta, ←/→ andam de palavra em palavra e Esc fecha.
// Remonta a cada capítulo; a área de trabalho mora no ReaderWorkspace (layout) e
// sobrevive à troca. Este componente só publica o capítulo e pede abas.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import {
  LAST_READ_KEY,
  adjacentChapter,
  chapterLabel,
  cleanSurface,
  glossOf,
  groupOriginal,
  nextColor,
  toParagraphs,
  originalFor,
  type ChapterRef,
  type HlColor,
  type LexShort,
  type OrigWord,
  type ReaderVerse,
  type Span,
} from "../../reader";
import { usfmToOsis } from "@/lib/bible/osis";
import { setHighlightAction } from "../../actions";
import { ChapterPicker } from "./ChapterPicker";
import { VerseMenu } from "./VerseMenu";
import { selectHit, useWorkspace, type EditorData } from "./ReaderWorkspace";
import styles from "./reader.module.css";

type Mode = "bible" | "original";
const TOGGLE_KEY = "tally.reader.interlinear";

export function ReaderView({
  refNow,
  verses,
  paragraphStarts,
  tagged,
  original,
  lex,
  textError,
  highlights,
  noted,
  editor,
}: {
  refNow: ChapterRef;
  verses: ReaderVerse[];
  paragraphStarts: number[];
  tagged: boolean;
  original: OrigWord[];
  lex: Record<string, LexShort>;
  textError: string;
  highlights: Record<number, HlColor>;
  noted: number[];
  editor: EditorData;
}) {
  const router = useRouter();
  const prev = useMemo(() => adjacentChapter(refNow, -1), [refNow]);
  const next = useMemo(() => adjacentChapter(refNow, 1), [refNow]);
  const [mode, setMode] = useState<Mode>("bible");
  const [interlinear, setInterlinear] = useState(false);
  const { publish, open, openNotes, closeAll, wordKey, wordStrong, jump, clearJump, setHits } = useWorkspace();
  // Destaques: estado otimista; a página só manda o retrato inicial do capítulo.
  const [hl, setHl] = useState(highlights);
  const [menuAt, setMenuAt] = useState<number | null>(null);
  const [hlError, setHlError] = useState("");
  const notedSet = useMemo(() => new Set(noted), [noted]);
  const closeMenu = useCallback((): void => setMenuAt(null), []);

  async function paint(verse: number, picked: HlColor): Promise<void> {
    const before = hl[verse];
    const after = nextColor(before, picked);
    const apply = (c: HlColor | null | undefined): void =>
      setHl((m) => {
        const { [verse]: _drop, ...rest } = m;
        return c ? { ...rest, [verse]: c } : rest;
      });
    apply(after);
    setMenuAt(null);
    setHlError("");
    const r = await setHighlightAction({ book: usfmToOsis(refNow.book) ?? "", chapter: refNow.chapter, verse, color: after });
    if (!r.success) {
      apply(before);
      setHlError(r.message || "Não consegui guardar o destaque.");
    }
  }
  // Chave do trecho inclui o capítulo: a aba Palavra sobrevive à troca e não pode
  // acender a palavra de mesma posição no capítulo seguinte.
  const base = `${refNow.book}.${refNow.chapter}.`;

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
      if (t?.closest('[data-testid="workspace"]')) return; // teclas dentro da área de trabalho são dela
      if (e.key === "Escape" && wordKey) return closeAll();
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const dir = e.key === "ArrowLeft" ? -1 : 1;
      // Palavra aberta neste capítulo: a seta anda de palavra; senão, de capítulo.
      const words = [...document.querySelectorAll<HTMLButtonElement>("[data-wkey]")];
      const i = wordKey ? words.findIndex((b) => b.dataset.wkey === wordKey) : -1;
      if (i >= 0) {
        e.preventDefault();
        const to = words[i + dir]?.dataset.wkey;
        if (to) selectHit(to);
        return;
      }
      go(dir === -1 ? prev : next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, prev, next, wordKey, closeAll]);

  const showWords = tagged && interlinear && mode === "bible";

  // Ocorrências da palavra aberta neste capítulo, na ordem do texto (mesmas chaves dos
  // botões). Publicadas para o contador "1 de N" da aba Ocorrências.
  const hits = useMemo((): string[] => {
    if (!wordStrong) return [];
    if (mode === "original") {
      return original
        .filter((w) => w.strong === wordStrong)
        .sort((a, b) => a.verse - b.verse || a.position - b.position)
        .map((w) => `${base}o${w.verse}:${w.position}`);
    }
    if (!showWords) return [];
    return verses.flatMap((v) => v.spans.flatMap((s, i) => (s.strong === wordStrong ? [`${base}${v.n}:${i}`] : [])));
  }, [wordStrong, mode, original, showWords, verses, base]);
  useEffect(() => setHits(hits), [hits, setHits]);

  // Chegou pela aba Ocorrências: liga as palavras se preciso e seleciona a 1ª ocorrência.
  useEffect(() => {
    if (!jump || jump.book !== refNow.book || jump.chapter !== refNow.chapter) return;
    if (mode === "bible" && tagged && !interlinear) return setInterlinear(true);
    clearJump();
    const first = hits[0];
    if (first) selectHit(first, "center");
  }, [jump, refNow, mode, tagged, interlinear, hits, clearJump]);
  const lexCredit = `léxico STEPBible (CC BY 4.0)${Object.values(lex).some((l) => l.gloss_pt) ? ", tradução Tally" : ""}`;

  function wordClass(key: string, strong: string, cls: string | undefined): string {
    if (key === wordKey) return `${cls} ${styles.hit}`;
    return strong === wordStrong ? `${cls} ${styles.same}` : (cls ?? "");
  }

  function renderSpan(s: Span, v: ReaderVerse, i: number): ReactNode {
    const strong = s.strong;
    if (!showWords || !strong) return <span key={i}>{s.text}</span>;
    const key = `${base}${v.n}:${i}`;
    // n-ésima vez que este Strong aparece no versículo → a mesma posição no original.
    const nth = v.spans.slice(0, i).filter((x) => x.strong === strong).length;
    return (
      <button
        key={i}
        type="button"
        data-strong={strong}
        data-wkey={key}
        aria-pressed={key === wordKey}
        className={wordClass(key, strong, styles.word)}
        onClick={() => {
          const o = originalFor(original, v.n, strong, nth);
          open({
            kind: "word", strong, key, ...refNow, verse: v.n, text: s.text.trim(),
            surface: o ? cleanSurface(o.surface) : null, translit: o?.translit ?? null, morph: o?.morph ?? null,
          });
        }}
      >
        {s.text}
      </button>
    );
  }

  const byVerse = mode === "original" ? groupOriginal(original) : [];
  const paragraphs = useMemo(() => toParagraphs(verses, paragraphStarts), [verses, paragraphStarts]);

  return (
    <div className={styles.main}>
      <div className={styles.bar}>
        <button type="button" className={styles.arrow} aria-label="Capítulo anterior" disabled={!prev} onClick={() => go(prev)}>‹</button>
        <ChapterPicker current={refNow} onPick={go} />
        <button type="button" className={styles.arrow} aria-label="Próximo capítulo" disabled={!next} onClick={() => go(next)}>›</button>
        <span className={styles.sep} aria-hidden />
        <Select compact value={mode} aria-label="Modo de leitura" onChange={(e) => setMode(e.target.value === "original" ? "original" : "bible")}>
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
          {hlError ? <p className={styles.muted} role="status">{hlError}</p> : null}
          {paragraphs.map((para, pi) => (
            <p key={para[0]?.n ?? pi} className={styles.para}>
              {pi === 0 ? <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span> : null}
              {para.map((v) => (
                <span key={v.n} data-verse={v.n}>
                  <span className={styles.vwrap}>
                    <button
                      type="button"
                      className={styles.vnum}
                      aria-label={`Versículo ${chapterLabel(refNow)}:${v.n}`}
                      aria-expanded={menuAt === v.n}
                      aria-haspopup="dialog"
                      onClick={() => setMenuAt((m) => (m === v.n ? null : v.n))}
                    >
                      {v.n}
                    </button>
                    {menuAt === v.n ? (
                      <VerseMenu
                        label={`${chapterLabel(refNow)}:${v.n}`}
                        color={hl[v.n]}
                        onColor={(c) => void paint(v.n, c)}
                        onNote={() => { setMenuAt(null); openNotes({ book: refNow.book, chapter: refNow.chapter, verse: v.n }); }}
                        onStudy={() => { setMenuAt(null); open({ kind: "verse", book: refNow.book, chapter: refNow.chapter, verse: v.n }); }}
                        onClose={closeMenu}
                      />
                    ) : null}
                  </span>
                  <span className={hl[v.n] ? `${styles.hl} ${styles[`hl_${hl[v.n]}`]}` : styles.hl} data-hl={hl[v.n]} data-testid="verse-text">
                    {v.spans.map((s, i) => renderSpan(s, v, i))}
                  </span>
                  {notedSet.has(v.n) ? (
                    <button type="button" className={styles.noteMark} aria-label={`Ver notas de ${chapterLabel(refNow)}:${v.n}`} data-testid="note-mark" onClick={() => openNotes({ book: refNow.book, chapter: refNow.chapter, verse: v.n })}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 13l.7-3L10.5 3.2a1.4 1.4 0 0 1 2 0l.3.3a1.4 1.4 0 0 1 0 2L6 12.3zM9.5 4.2l2.3 2.3" /></svg>
                    </button>
                  ) : null}{" "}
                </span>
              ))}
            </p>
          ))}
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
                const key = `${base}o${v.n}:${w.position}`;
                return (
                  <button
                    key={w.position}
                    type="button"
                    data-strong={strong ?? undefined}
                    data-wkey={strong ? key : undefined}
                    aria-pressed={strong ? key === wordKey : undefined}
                    disabled={!strong}
                    className={strong ? wordClass(key, strong, styles.ilw) : styles.ilw}
                    onClick={() => {
                      if (!strong) return;
                      open({
                        kind: "word", strong, key, ...refNow, verse: v.n, text: glossOf(lex[strong]),
                        surface: cleanSurface(w.surface), translit: w.translit, morph: w.morph ?? null,
                      });
                    }}
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
    </div>
  );
}
