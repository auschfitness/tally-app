"use client";

// Área de trabalho da leitura (spec 07), montada pelo layout de /study/bible: sobrevive à
// troca de capítulo (a página do capítulo remonta a cada navegação). Guarda as abas, o
// bloco a caminho do sermão, o versículo da nota e o último retrato de cada sermão
// gravado; o ReaderView de cada capítulo publica aqui o capítulo atual, o léxico e os
// dados do editor.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { bookName } from "@/lib/bible/books";
import type { SectionKey } from "../../domain";
import type { Sermon, Series } from "../../types";
import { EMPTY_WS, closeTab, openTab, tabKey, type ChapterRef, type LexShort, type Workspace, type WsTab } from "../../reader";
import { BibleCompare } from "../BibleCompare";
import { NotesTab } from "./NotesTab";
import { SermonTab } from "./SermonTab";
import { WordTab } from "./WordTab";
import { WorkspacePane } from "./WorkspacePane";
import styles from "./reader.module.css";

export interface EditorData {
  sermons: Sermon[];
  series: Series[];
  services: { id: string; name: string }[];
  campuses: string[];
  activeCampus: string;
  locale: string;
}
export type Incoming = { block: string; section: SectionKey; seq: number };
type VerseAt = { book: string; chapter: number; verse: number };

interface WorkspaceApi {
  sermonOpen: boolean;
  open: (t: WsTab) => void;
  openNotes: (at: VerseAt | null) => void;
  sendBlock: (block: string, section: SectionKey) => void;
  publish: (refNow: ChapterRef, lex: Record<string, LexShort>, editor: EditorData) => void;
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkspace fora do ReaderWorkspace");
  return api;
}

const CLOSE_MS = 200;
const TEXT_SELECTOR = '[data-testid="reader-text"], [data-testid="reader-original"]';

function focusLater(get: () => HTMLElement | null): void {
  window.requestAnimationFrame(() => get()?.focus({ preventScroll: true }));
}

export function ReaderWorkspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ws, setWs] = useState<Workspace>(EMPTY_WS);
  const [closing, setClosing] = useState(false);
  const [noteAt, setNoteAt] = useState<VerseAt | null>(null);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [saved, setSaved] = useState<Record<string, Sermon>>({});
  const [refNow, setRefNow] = useState<ChapterRef | null>(null);
  const [editor, setEditor] = useState<EditorData | null>(null);
  const [lex, setLex] = useState<Record<string, LexShort>>({});
  const closeTimer = useRef<number | null>(null);
  const seq = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const clearCloseTimer = useCallback((): void => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const open = useCallback((t: WsTab): void => {
    clearCloseTimer();
    setClosing(false);
    setWs((w) => openTab(w, t));
  }, [clearCloseTimer]);

  // Fechar tudo anima a saída e só então desmonta; o foco volta ao texto.
  const closeAll = useCallback((): void => {
    clearCloseTimer();
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setWs(EMPTY_WS);
      setClosing(false);
    }, CLOSE_MS);
    focusLater(() => document.querySelector<HTMLElement>(TEXT_SELECTOR));
  }, [clearCloseTimer]);

  function closeOne(key: string): void {
    const nextWs = closeTab(ws, key);
    if (nextWs.tabs.length === 0) return closeAll();
    setWs(nextWs);
    const active = nextWs.active;
    if (active) focusLater(() => document.getElementById(`ws-tab-${active}`));
  }

  const openNotes = useCallback((at: VerseAt | null): void => {
    setNoteAt(at);
    open({ kind: "notes" });
  }, [open]);

  const sendBlock = useCallback((block: string, section: SectionKey): void => {
    seq.current += 1;
    setIncoming({ block, section, seq: seq.current });
  }, []);
  // Entregue a um editor, o bloco sai da fila: outro sermão aberto depois não o recebe.
  const onIncomingDone = useCallback((n: number): void => setIncoming((p) => (p?.seq === n ? null : p)), []);

  const publish = useCallback((r: ChapterRef, l: Record<string, LexShort>, e: EditorData): void => {
    setRefNow(r);
    setEditor(e);
    setLex((prev) => ({ ...prev, ...l }));
  }, []);

  const onSaved = useCallback((s: Sermon): void => setSaved((m) => ({ ...m, [s.id]: s })), []);

  const go = useCallback((r: ChapterRef): void => router.push(`/study/bible/${r.book}/${r.chapter}`), [router]);

  const sermonOpen = ws.tabs.some((t) => t.kind === "sermon");
  const api = useMemo<WorkspaceApi>(() => ({ sermonOpen, open, openNotes, sendBlock, publish }), [sermonOpen, open, openNotes, sendBlock, publish]);

  // Altura da tela = janela − o que fica acima (topo do app) − o padding de baixo do
  // `.content`. Medido, porque o topo muda de altura (quebra de linha, celular).
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const parent = el.parentElement;
    function measure(): void {
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const pad = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0;
      el.style.setProperty("--reader-top", `${Math.round(top + pad)}px`);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    if (parent) ro.observe(parent);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const addable: { kind: "notes" | "sermon"; label: string }[] = [];
  if (!ws.tabs.some((t) => t.kind === "notes")) addable.push({ kind: "notes", label: "Notas" });
  if (!sermonOpen) addable.push({ kind: "sermon", label: "Sermão" });

  function renderTab(t: WsTab): ReactNode {
    if (!refNow || !editor) return null;
    if (t.kind === "word") return <WordTab strong={t.strong} lex={lex} onGo={go} />;
    if (t.kind === "verse") {
      const r = { book: t.book, chapter: t.chapter, verse_start: t.verse, verse_end: null, reference: `${bookName(t.book)} ${t.chapter}:${t.verse}` };
      return <BibleCompare embedded initialRef={r} locale={editor.locale} onAddToSermon={sermonOpen ? sendBlock : undefined} onClose={() => closeOne(tabKey(t))} />;
    }
    if (t.kind === "notes") {
      const verse = noteAt && noteAt.book === refNow.book && noteAt.chapter === refNow.chapter ? noteAt.verse : null;
      return <NotesTab refNow={refNow} verse={verse} />;
    }
    return <SermonTab editor={editor} incoming={incoming} saved={saved} onSaved={onSaved} onIncomingDone={onIncomingDone} />;
  }

  const paneOn = ws.tabs.length > 0 && refNow != null && editor != null;
  return (
    <Ctx.Provider value={api}>
      <div ref={gridRef} className={`${styles.reader} ${paneOn ? styles.withPane : ""}`}>
        <div className={styles.col}>{children}</div>
        {paneOn ? (
          <WorkspacePane
            ws={ws}
            lex={lex}
            closing={closing}
            onActivate={(key) => setWs((w) => ({ ...w, active: key }))}
            onCloseTab={closeOne}
            onCloseAll={closeAll}
            renderTab={renderTab}
            addable={addable}
            onAdd={(k) => (k === "notes" ? openNotes(null) : open({ kind: "sermon" }))}
          />
        ) : null}
      </div>
    </Ctx.Provider>
  );
}
