"use client";

// Notas (spec 9): lista à esquerda e a nota aberta à direita (>= 900px); no celular só a
// lista, e a nota entra em tela cheia pela direita. A seleção vive em ?n=<key>
// (replaceState no computador, pushState no celular para o voltar do aparelho fechar).
// Salva sozinho 800ms depois de parar de digitar e ao sair do campo.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MoreHorizontal, SquarePen } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { createClient } from "@/lib/supabase/client";
import { BOOKS, bookName } from "@/lib/bible/books";
import { usfmToOsis } from "@/lib/bible/osis";
import { buildReference, parseRefs } from "@/lib/bible/parse";
import { deleteNoteAction, deleteTextNoteAction, saveLooseNoteAction, saveTextNoteAction } from "../actions";
import { READER_TRANSLATION } from "../reader-queries";
import { curlyQuotes } from "../reader";
import { groupNotesByDate, joinNote, noteDate, searchNotes, splitNote, swipeCloses, type NoteItem } from "../domain";
import { Chip, MenuChip, MenuItem } from "./FilterChips";
import { Popover } from "./Popover";
import styles from "../study.module.css";

type Kind = "text" | "loose" | null;
const SAVE_MS = 800;
const urlKey = (n: NoteItem) => (n.id ? n.key : null);

function setUrl(key: string | null, push = false) {
  const url = key ? `/study/notes?n=${encodeURIComponent(key)}` : "/study/notes";
  if (push) window.history.pushState({ note: key }, "", url);
  else window.history.replaceState(null, "", url);
}

export function NotesLibrary({ items: initialItems, initialKey }: { items: NoteItem[]; initialKey: string | null }) {
  const [items, setItems] = useState(initialItems);
  const [sel, setSel] = useState<string | null>(() =>
    initialKey && initialItems.some((n) => n.key === initialKey) ? initialKey : initialItems[0]?.key ?? null,
  );
  const [mobileOpen, setMobileOpen] = useState(() => !!initialKey && initialItems.some((n) => n.key === initialKey));
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [focusBody, setFocusBody] = useState(0);
  const [kind, setKind] = useState<Kind>(null);
  const [book, setBook] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const pushed = useRef(false);
  const live = useRef<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);

  const isMobile = () => window.matchMedia("(max-width: 56.1875rem)").matches;

  const books = useMemo(() => {
    const n = new Map<string, number>();
    for (const it of items) if (it.book) n.set(it.book, (n.get(it.book) ?? 0) + 1);
    return BOOKS.filter((b) => n.has(b.code)).map((b) => ({ code: b.code, name: b.pt, count: n.get(b.code)! }));
  }, [items]);
  const filtered = useMemo(
    () => items.filter((n) => (!kind || n.kind === kind) && (!book || n.book === book)),
    [items, kind, book],
  );
  const searching = q.trim().length > 0;
  const results = searching ? searchNotes(filtered, q) : [];
  const groups = searching ? [] : groupNotesByDate(filtered, now);
  const visible = searching ? results : groups.flatMap((g) => g.items);
  const current = items.find((n) => n.key === sel) ?? null;

  // Nota solta nova e vazia ao sair = descartada.
  const leave = useCallback(
    (key: string | null) => {
      if (!key || !fresh.has(key)) return;
      const n = items.find((x) => x.key === key);
      if (!n || n.kind !== "loose" || (live.current[key] ?? n.text).trim()) return;
      setItems((list) => list.filter((x) => x.key !== key));
      if (n.id) {
        const f = new FormData();
        f.set("id", n.id);
        void deleteNoteAction(f);
      }
    },
    [fresh, items],
  );

  function open(key: string) {
    if (key !== sel) leave(sel);
    setSel(key);
    const n = items.find((x) => x.key === key);
    const k = n ? urlKey(n) : null;
    if (isMobile()) {
      setMobileOpen(true);
      setUrl(k, true);
      pushed.current = true;
    } else setUrl(k);
  }

  function closeMobile() {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      setMobileOpen(false);
      setUrl(null);
    }
  }

  useSwipeToClose(paneRef, mobileOpen, () => closeMobile());

  useEffect(() => {
    function onPop() {
      pushed.current = false;
      setMobileOpen(false);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const newNote = useCallback(() => {
    const key = "new-" + Date.now();
    const n: NoteItem = { key, kind: "loose", id: "", label: "Nova nota", body: "", at: new Date().toISOString(), book: null, chapter: null, verse: null, verseEnd: null, text: "" };
    leave(sel);
    setItems((list) => [n, ...list]);
    setFresh((s) => new Set(s).add(key));
    setKind(null);
    setBook(null);
    setQ("");
    setSel(key);
    setFocusBody((x) => x + 1);
    if (isMobile()) {
      setMobileOpen(true);
      setUrl(null, true);
      pushed.current = true;
    } else setUrl(null);
  }, [leave, sel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyN") {
        e.preventDefault();
        newNote();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [newNote]);

  function onListKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const at = visible.findIndex((n) => n.key === sel);
    const next = visible[at < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)))];
    if (!next) return;
    e.preventDefault();
    leave(sel);
    setSel(next.key);
    setUrl(urlKey(next));
    listRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(next.key)}"]`)?.focus();
  }

  function onSaved(key: string, patch: Partial<NoteItem>) {
    setItems((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    if (patch.id && key === sel) {
      const n = items.find((x) => x.key === key);
      if (n && !isMobile()) setUrl((patch.kind ?? n.kind) === "text" ? "t" + patch.id : "l" + patch.id);
    }
  }

  async function trash(n: NoteItem) {
    if (n.id) {
      if (n.kind === "text") await deleteTextNoteAction(n.id);
      else {
        const f = new FormData();
        f.set("id", n.id);
        await deleteNoteAction(f);
      }
    }
    const rest = items.filter((x) => x.key !== n.key);
    setItems(rest);
    const next = rest[0] ?? null;
    setSel(next?.key ?? null);
    if (isMobile()) closeMobile();
    else setUrl(next ? urlKey(next) : null);
  }

  const row = (n: NoteItem) => (
    <button
      key={n.key}
      type="button"
      data-key={n.key}
      className={styles.nRow}
      aria-current={n.key === sel ? "true" : undefined}
      onClick={() => open(n.key)}
    >
      <span className={styles.nRef}>{n.label}</span>
      <span className={styles.nDate}>{noteDate(n.at, now)}</span>
      <span className={styles.nText}>{n.body.split("\n")[0] || " "}</span>
    </button>
  );

  const emptyState = (
    <div className={styles.libEmpty}>
      <p>Suas notas ficam aqui. Abra a Bíblia e toque em Notas para criar a primeira.</p>
      <Link href="/study/bible" className={styles.primary}>Abrir a Bíblia</Link>
    </div>
  );

  return (
    <div className={styles.nWrap}>
      <div className={styles.nList}>
        <div className={styles.nHead}>
          <h1 className="page">Notas</h1>
          <button type="button" className="iconbtn" aria-label="Nova nota" title="Nova nota (Ctrl+Alt+N)" onClick={newNote}>
            <UiIcon icon={SquarePen} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.nEmptyList}>{emptyState}</div>
        ) : (
          <>
            <input
              className={styles.libSearch}
              type="search"
              placeholder="Buscar nas notas"
              aria-label="Buscar nas notas"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className={styles.chipRow} role="group" aria-label="Filtros">
              <Chip on={!kind} onClick={() => setKind(null)}>Todas</Chip>
              <Chip on={kind === "text"} onClick={() => setKind("text")}>Do texto</Chip>
              <Chip on={kind === "loose"} onClick={() => setKind("loose")}>Soltas</Chip>
              <MenuChip label="Livro" value={book ? bookName(book) : null} onClear={() => setBook(null)}>
                {(close) =>
                  books.length === 0 ? (
                    <p className={styles.miEmpty}>Nenhuma nota com passagem ainda.</p>
                  ) : (
                    <div className={styles.popList}>
                      {books.map((b) => (
                        <MenuItem key={b.code} on={book === b.code} count={b.count} onClick={() => { setBook(b.code); close(); }}>
                          {b.name}
                        </MenuItem>
                      ))}
                    </div>
                  )
                }
              </MenuChip>
            </div>

            <div ref={listRef} className={styles.nRows} onKeyDown={onListKey}>
              {searching ? (
                <>
                  <div className={styles.libCount}>{results.length} {results.length === 1 ? "resultado" : "resultados"}</div>
                  {results.length === 0 ? <div className={styles.libEmpty}>Nada encontrado para “{q.trim()}”.</div> : results.map(row)}
                </>
              ) : visible.length === 0 ? (
                <div className={styles.libEmpty}>Nenhuma nota com esses filtros.</div>
              ) : (
                groups.map((g) => (
                  <section key={g.label}>
                    <h2 className={styles.libSec}>{g.label}</h2>
                    {g.items.map(row)}
                  </section>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div ref={paneRef} className={`${styles.nPane}${mobileOpen ? " " + styles.nPaneOpen : ""}`}>
        <button type="button" className={`${styles.back} ${styles.nBack}`} onClick={closeMobile}>
          <UiIcon icon={ChevronLeft} />
          Notas
        </button>
        {current ? (
          <NotePane
            key={current.key}
            n={current}
            focus={fresh.has(current.key) ? focusBody : 0}
            onType={(t) => (live.current[current.key] = t)}
            onSaved={(p) => onSaved(current.key, p)}
            onTrash={() => trash(current)}
          />
        ) : items.length === 0 ? (
          emptyState
        ) : null}
      </div>
    </div>
  );
}

// Texto do versículo citado, do mesmo banco que a leitura usa (bible_tagged_verses).
function useVerseText(n: NoteItem): string {
  const [text, setText] = useState("");
  useEffect(() => {
    const osis = n.book ? usfmToOsis(n.book) : null;
    if (n.kind !== "text" || !osis || !n.chapter || !n.verse) return;
    let alive = true;
    void createClient()
      .from("bible_tagged_verses")
      .select("verse, spans")
      .eq("translation", READER_TRANSLATION)
      .eq("book", osis)
      .eq("chapter", n.chapter)
      .gte("verse", n.verse)
      .lte("verse", n.verseEnd ?? n.verse)
      .order("verse")
      .then(({ data }) => {
        if (!alive || !data) return;
        const verses = data.map((r) =>
          curlyQuotes((r.spans as [string, string | null][]).map(([text, strong]) => ({ text, strong })))
            .map((s) => s.text)
            .join("")
            .trim(),
        );
        setText(verses.join(" "));
      });
    return () => {
      alive = false;
    };
  }, [n.kind, n.book, n.chapter, n.verse, n.verseEnd]);
  return text;
}

function NotePane({
  n,
  focus,
  onType,
  onSaved,
  onTrash,
}: {
  n: NoteItem;
  focus: number;
  onType: (text: string) => void;
  onSaved: (p: Partial<NoteItem>) => void;
  onTrash: () => void;
}) {
  const router = useRouter();
  const loose = n.kind === "loose";
  const sp = loose ? splitNote(n.text) : null;
  const [title, setTitle] = useState(sp?.title ?? "");
  const [body, setBody] = useState(loose ? sp!.content : n.body);
  const [passage, setPassage] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const savedTimer = useRef<number | undefined>(undefined);
  const last = useRef(loose ? joinNote(title, body) : body.trim());
  const idRef = useRef(n.id);
  const kindRef = useRef(n.kind);
  const verse = useVerseText(n);

  // Textarea que cresce com o texto.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [body]);

  useEffect(() => {
    if (focus) area.current?.focus();
  }, [focus]);

  // Um salvamento por vez (blur e debounce juntos não podem inserir duas vezes); cada um
  // lê o estado mais recente.
  const latest = useRef({ title, body, passage, n, onSaved });
  latest.current = { title, body, passage, n, onSaved };
  const chain = useRef<Promise<void>>(Promise.resolve());

  const doSave = useCallback(async () => {
    const { title, body, passage, n, onSaved } = latest.current;
    const ref = kindRef.current === "loose" && passage.trim() ? parseRefs(passage)[0] : null;
    if (kindRef.current === "loose" && passage.trim() && !ref) return void setErr("Não reconheci a passagem. Tente assim: João 3:16.");
    setErr("");
    const text = kindRef.current === "loose" ? joinNote(title, body) : body.trim();
    if (!text.trim() || (text === last.current && !ref)) return;
    const at = new Date().toISOString();
    if (ref) {
      // Com passagem válida a nota solta vira nota do texto (mesma regra da antiga folha).
      const osis = usfmToOsis(ref.book);
      if (!osis) return;
      const r = await saveTextNoteAction({ book: osis, chapter: ref.chapter, verse_start: ref.verse_start, verse_end: ref.verse_end, body: text });
      if (!r.success) return void setErr(r.message || "Não consegui guardar a nota.");
      if (idRef.current) {
        const f = new FormData();
        f.set("id", idRef.current);
        void deleteNoteAction(f);
      }
      idRef.current = r.data.id;
      kindRef.current = "text";
      last.current = text;
      setTitle("");
      setBody(text);
      onSaved({ kind: "text", id: r.data.id, label: buildReference(ref.book, ref.chapter, ref.verse_start, ref.verse_end), body: text, text, at, book: ref.book, chapter: ref.chapter, verse: ref.verse_start, verseEnd: ref.verse_end });
    } else if (kindRef.current === "text") {
      const osis = n.book ? usfmToOsis(n.book) : null;
      const r = await saveTextNoteAction({ id: idRef.current, book: osis ?? "", chapter: n.chapter ?? 0, verse_start: n.verse, verse_end: n.verseEnd, body: text });
      if (!r.success) return void setErr(r.message || "Não consegui guardar a nota.");
      last.current = text;
      onSaved({ body: text, text, at });
    } else {
      const r = await saveLooseNoteAction({ id: idRef.current || null, text });
      if (!r.success) return void setErr(r.message || "Não consegui guardar a nota.");
      idRef.current = r.data.id;
      last.current = text;
      const s = splitNote(text);
      onSaved({ id: r.data.id, label: s.title || "(sem título)", body: s.content, text, at });
    }
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1500);
  }, []);

  const save = useCallback(() => {
    window.clearTimeout(timer.current);
    chain.current = chain.current.then(doSave, doSave);
    return chain.current;
  }, [doSave]);

  // Debounce: 800ms depois da última tecla.
  useEffect(() => {
    timer.current = window.setTimeout(() => void save(), SAVE_MS);
    return () => window.clearTimeout(timer.current);
  }, [save, title, body, passage]);

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const isText = kindRef.current === "text" && n.book;
  const bibleHref = n.book ? `/study/bible/${n.book}/${n.chapter ?? 1}` : "";

  return (
    <article className={styles.np}>
      <div className={styles.npMeta}>
        <span suppressHydrationWarning>{new Date(n.at).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        {isText ? <Link href={bibleHref} className="link">Abrir na Bíblia</Link> : null}
        <span className={`${styles.npSaved}${saved ? " " + styles.npSavedOn : ""}`} aria-live="polite">{saved ? "Salvo" : ""}</span>
        <Popover trigger={<UiIcon icon={MoreHorizontal} />} triggerClass="iconbtn" label="Mais ações da nota" align="right">
          {(close) => (
            <>
              {isText ? (
                <button type="button" role="menuitem" className={styles.mi} onClick={() => { close(); router.push(bibleHref); }}>Abrir na Bíblia</button>
              ) : null}
              <button type="button" role="menuitem" className={`${styles.mi} ${styles.miDanger}`} onClick={() => { close(); onTrash(); }}>Mover para a lixeira</button>
            </>
          )}
        </Popover>
      </div>

      {kindRef.current === "loose" && !n.book ? (
        <>
          <input
            className={styles.npPassage}
            placeholder="Passagem (opcional), ex.: João 3:16"
            aria-label="Passagem (opcional)"
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            onBlur={() => void save()}
          />
          <input
            className={styles.npTitle}
            placeholder="Título"
            aria-label="Título"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onType(joinNote(e.target.value, body));
            }}
            onBlur={() => void save()}
          />
        </>
      ) : (
        <h2 className={styles.npTitle}>{n.label}</h2>
      )}

      {isText && verse ? <blockquote className={styles.npVerse}>{verse}</blockquote> : null}

      <textarea
        ref={area}
        className={styles.npBody}
        placeholder="Escreva sua nota…"
        aria-label="Texto da nota"
        rows={4}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          onType(kindRef.current === "loose" ? joinNote(title, e.target.value) : e.target.value);
        }}
        onBlur={() => void save()}
      />
      {err ? <p className={styles.npErr} role="alert">{err}</p> : null}
    </article>
  );
}

// Celular: arrastar a nota aberta para a direita fecha (segue o dedo 1:1, fecha por
// distância ou por velocidade, senão volta). Ignora a faixa da borda, que é do sistema
// (voltar do iOS/Android já fecha via popstate), e campos de texto, onde arrastar seleciona.
function useSwipeToClose(ref: RefObject<HTMLDivElement | null>, enabled: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const EDGE = 24;
    const SLOP = 10;
    let id: number | null = null;
    let x0 = 0, y0 = 0, dx = 0, mode: "?" | "x" | "no" = "?";
    let hist: { x: number; t: number }[] = [];

    const reset = () => {
      el.style.transition = "";
      el.style.transform = "";
    };
    function down(e: PointerEvent) {
      if (e.pointerType !== "touch" || id !== null) return;
      if (e.clientX < EDGE) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable], button, a")) return;
      id = e.pointerId;
      x0 = e.clientX; y0 = e.clientY; dx = 0; mode = "?";
      hist = [{ x: e.clientX, t: e.timeStamp }];
    }
    function move(e: PointerEvent) {
      if (e.pointerId !== id) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (mode === "?") {
        if (Math.hypot(mx, my) < SLOP) return;
        mode = mx > 0 && Math.abs(mx) > Math.abs(my) * 1.2 ? "x" : "no";
        if (mode === "x") {
          el!.setPointerCapture(e.pointerId);
          el!.style.transition = "none";
        }
      }
      if (mode !== "x") return;
      dx = Math.max(0, mx);
      el!.style.transform = `translateX(${dx}px)`;
      hist.push({ x: e.clientX, t: e.timeStamp });
      if (hist.length > 5) hist.shift();
    }
    function up(e: PointerEvent) {
      if (e.pointerId !== id) return;
      id = null;
      if (mode !== "x") return;
      const a = hist[0], b = hist[hist.length - 1];
      const v = b && a && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
      if (e.type !== "pointercancel" && swipeCloses(dx, v, el!.clientWidth)) {
        el!.style.transition = "transform 200ms cubic-bezier(.32, .72, 0, 1)";
        el!.style.transform = "translateX(100%)";
        window.setTimeout(() => {
          close.current();
          // O CSS de fechado assume daqui; limpar depois do frame evita piscar.
          requestAnimationFrame(reset);
        }, 200);
      } else {
        el!.style.transition = "transform 260ms cubic-bezier(.32, .72, 0, 1)";
        el!.style.transform = "translateX(0)";
        window.setTimeout(reset, 260);
      }
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      reset();
    };
  }, [ref, enabled]);
}
