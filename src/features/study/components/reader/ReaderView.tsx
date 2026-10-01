"use client";

// Tela de leitura (spec 07): barra, texto, chave Interlinear, modo Original. Tocar uma
// palavra abre direto a aba Palavra (sem balão, como no Raízes); a palavra tocada ganha
// contorno e as outras ocorrências do mesmo original no capítulo, um fundo leve.
// Com uma palavra aberta, ←/→ andam de palavra em palavra e Esc fecha.
// Versículos se selecionam (toque no texto sem Interlinear, número, botão direito, toque
// longo) e a SelectionBar age sobre a seleção: cor, nota, estudo, cópia (spec 08).
// Remonta a cada capítulo; a área de trabalho mora no ReaderWorkspace (layout) e
// sobrevive à troca. Este componente só publica o capítulo e pede abas.
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import {
  LAST_READ_KEY,
  adjacentChapter,
  chapterLabel,
  cleanSurface,
  glossOf,
  groupOriginal,
  colorFor,
  copyText,
  selectionLabel,
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
import { SelectionBar } from "./SelectionBar";
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
  const [hlError, setHlError] = useState("");
  const notedSet = useMemo(() => new Set(noted), [noted]);
  // Seleção: versículos em ordem; anchor = ponto (relativo ao texto) onde a barra flutua.
  const [sel, setSel] = useState<number[]>([]);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const swallow = useRef(false); // o clique que sucede um toque longo não vale

  function select(n: number, at: { x: number; y: number }, how: "toggle" | "add"): void {
    setSel((cur) => {
      if (cur.includes(n)) return how === "add" ? cur : cur.filter((v) => v !== n);
      return [...cur, n].sort((a, b) => a - b);
    });
    setAnchor(at);
  }
  // Ponto do ponteiro relativo ao texto (a barra é absoluta dentro dele), um pouco abaixo.
  function pointAt(e: { clientX: number; clientY: number; currentTarget: HTMLElement }): { x: number; y: number } {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top + 14 };
  }
  function verseOf(e: { target: EventTarget }): number | null {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-verse]");
    return el ? Number(el.dataset.verse) : null;
  }
  function onTextClick(e: MouseEvent<HTMLElement>): void {
    if (showWords) return; // com palavras, o toque no texto é da palavra
    if ((e.target as HTMLElement).closest("button")) return;
    if (window.getSelection()?.isCollapsed === false) return; // arrastou para copiar texto
    const n = verseOf(e);
    if (n !== null) select(n, pointAt(e), "toggle");
  }
  function onTextContextMenu(e: MouseEvent<HTMLElement>): void {
    const n = verseOf(e);
    if (n === null) return;
    e.preventDefault();
    select(n, pointAt(e), "add");
  }
  function cancelPress(): void {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }
  function onTextPointerDown(e: PointerEvent<HTMLElement>): void {
    swallow.current = false;
    cancelPress();
    const n = verseOf(e);
    if (e.pointerType !== "touch" || n === null) return;
    const at = pointAt(e);
    const timer = window.setTimeout(() => {
      press.current = null;
      swallow.current = true;
      navigator.vibrate?.(10);
      select(n, at, "add");
    }, 450);
    press.current = { timer, x: e.clientX, y: e.clientY };
  }
  function onTextPointerMove(e: PointerEvent<HTMLElement>): void {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress();
  }
  function onTextClickCapture(e: MouseEvent<HTMLElement>): void {
    if (!swallow.current) return;
    swallow.current = false;
    e.preventDefault();
    e.stopPropagation();
  }
  const first = sel[0]; // a nota e o estudo abrem no primeiro versículo da seleção
  const clearSel = useCallback((): void => setSel([]), []);

  // Aplica (ou tira, com null) a cor em toda a seleção; otimista e desfaz se falhar.
  async function paint(picked: HlColor | null): Promise<void> {
    const verses = sel;
    const before = verses.map((v) => hl[v]);
    const after = picked === null ? null : colorFor(before, picked);
    const put = (colors: (HlColor | null | undefined)[]): void =>
      setHl((m) => {
        const next = { ...m };
        verses.forEach((v, i) => {
          const c = colors[i];
          if (c) next[v] = c;
          else delete next[v];
        });
        return next;
      });
    put(verses.map(() => after));
    setSel([]);
    setHlError("");
    const r = await setHighlightAction({ book: usfmToOsis(refNow.book) ?? "", chapter: refNow.chapter, verses, color: after });
    if (!r.success) {
      put(before);
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
      if (e.key === "Escape" && sel.length) return setSel([]);
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
  }, [go, prev, next, wordKey, closeAll, sel.length]);

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
            quote: {
              before: v.spans.slice(0, i).map((x) => x.text).join("").trimStart(),
              word: s.text,
              after: v.spans.slice(i + 1).map((x) => x.text).join("").trimEnd(),
            },
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
        <Select compact value={mode} aria-label="Modo de leitura" onChange={(e) => { setMode(e.target.value === "original" ? "original" : "bible"); setSel([]); }}>
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
        <article
          className={`${styles.text} ${styles.verses}`}
          lang="pt-BR"
          data-testid="reader-text"
          tabIndex={-1}
          onClick={onTextClick}
          onClickCapture={onTextClickCapture}
          onContextMenu={onTextContextMenu}
          onPointerDown={onTextPointerDown}
          onPointerMove={onTextPointerMove}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
        >
          <div className={styles.eyebrow}>{chapterLabel(refNow)} · Bíblia Livre</div>
          {textError ? <p className={styles.muted}>{textError}</p> : null}
          {hlError ? <p className={styles.muted} role="status">{hlError}</p> : null}
          {paragraphs.map((para, pi) => (
            <p key={para[0]?.n ?? pi} className={styles.para}>
              {pi === 0 ? <span className={styles.dropcap} aria-hidden>{refNow.chapter}</span> : null}
              {para.map((v) => (
                <span key={v.n} data-verse={v.n}>
                  <button
                    type="button"
                    className={styles.vnum}
                    aria-label={`Versículo ${chapterLabel(refNow)}:${v.n}`}
                    aria-pressed={sel.includes(v.n)}
                    onClick={(e) => {
                      const art = e.currentTarget.closest("article")?.getBoundingClientRect();
                      const r = e.currentTarget.getBoundingClientRect();
                      select(v.n, { x: r.left - (art?.left ?? 0), y: r.bottom - (art?.top ?? 0) + 4 }, "toggle");
                    }}
                  >
                    {v.n}
                  </button>
                  <span className={[styles.hl, hl[v.n] ? styles[`hl_${hl[v.n]}`] : "", sel.includes(v.n) ? styles.selected : ""].filter(Boolean).join(" ")} data-hl={hl[v.n]} data-testid="verse-text">
                    {v.spans.map((s, i) => renderSpan(s, v, i))}
                  </span>
                  {notedSet.has(v.n) ? (
                    <button type="button" className={styles.noteMark} aria-label={`Ver notas de ${chapterLabel(refNow)}:${v.n}`} data-testid="note-mark" onClick={() => openNotes({ book: refNow.book, chapter: refNow.chapter, verse: v.n })}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /><path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8l-3.9 1 1-3.9z" /></svg>
                    </button>
                  ) : null}{" "}
                </span>
              ))}
            </p>
          ))}
          {sel.length > 0 && anchor ? (
            <SelectionBar
              label={selectionLabel(refNow, sel)}
              anchor={anchor}
              colors={sel.map((v) => hl[v])}
              copyText={copyText(refNow, verses, sel)}
              onColor={(c) => void paint(c)}
              onNote={() => { setSel([]); if (first !== undefined) openNotes({ book: refNow.book, chapter: refNow.chapter, verse: first }); }}
              onStudy={() => { setSel([]); if (first !== undefined) open({ kind: "verse", book: refNow.book, chapter: refNow.chapter, verse: first }); }}
              onClose={clearSel}
            />
          ) : null}
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
