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
  originalFor,
  type ChapterRef,
  type LexShort,
  type OrigWord,
  type ReaderVerse,
  type Span,
} from "../../reader";
import { ChapterPicker } from "./ChapterPicker";
import { selectHit, useWorkspace, type EditorData } from "./ReaderWorkspace";
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
  const { publish, open, closeAll, wordKey, wordStrong, jump, clearJump, setHits } = useWorkspace();
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

  return (
    <div className={styles.main}>
      <div className={styles.bar}>
        <ChapterPicker current={refNow} onPick={go} />
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
          <p className={styles.para}>
            <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span>
            {verses.map((v) => (
              <span key={v.n}>
                <button type="button" className={styles.vnum} aria-label={`Estudar ${chapterLabel(refNow)}:${v.n}`} onClick={() => open({ kind: "verse", book: refNow.book, chapter: refNow.chapter, verse: v.n })}>{v.n}</button>
                {v.spans.map((s, i) => renderSpan(s, v, i))}{" "}
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
