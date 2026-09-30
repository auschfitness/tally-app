// Tela de leitura (spec 07): regras PURAS — montar versículos, capítulos vizinhos,
// ocorrências por livro, abas da área de trabalho e a gaveta do celular. Sem React,
// sem Supabase: tudo aqui é testável em reader.test.ts.
import { BOOKS, bookByCode, bookName } from "@/lib/bible/books";
import { osisToUsfm } from "@/lib/bible/osis";

export interface Span {
  text: string;
  strong: string | null;
}
export interface ReaderVerse {
  n: number;
  spans: Span[];
}
export interface TaggedWordRow {
  verse: number;
  position: number;
  text: string;
  strong: string | null;
}
export interface OrigWord {
  verse: number;
  position: number;
  surface: string;
  strong: string | null;
  translit: string | null;
  lang: string;
}
export interface LexShort {
  strong: string;
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  gloss_pt: string | null;
}
// Livro em USFM (JHN), como a rota e BOOKS.
export interface ChapterRef {
  book: string;
  chapter: number;
}

export function versesFromTagged(rows: TaggedWordRow[]): ReaderVerse[] {
  const byVerse = new Map<number, TaggedWordRow[]>();
  for (const r of rows) {
    const list = byVerse.get(r.verse) ?? [];
    list.push(r);
    byVerse.set(r.verse, list);
  }
  return [...byVerse.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, list]) => ({
      n,
      spans: [...list].sort((a, b) => a.position - b.position).map((w) => ({ text: w.text, strong: w.strong || null })),
    }));
}

export function versesFromPlain(vs: { n: number; text: string }[]): ReaderVerse[] {
  return vs.map((v) => ({ n: v.n, spans: [{ text: v.text, strong: null }] }));
}

export function groupOriginal(words: OrigWord[]): { n: number; words: OrigWord[] }[] {
  const byVerse = new Map<number, OrigWord[]>();
  for (const w of words) {
    const list = byVerse.get(w.verse) ?? [];
    list.push(w);
    byVerse.set(w.verse, list);
  }
  return [...byVerse.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, list]) => ({ n, words: [...list].sort((a, b) => a.position - b.position) }));
}

// Capítulos por livro, ordem canônica 1..66 (a mesma de BOOKS por `order`). Total 1189.
const COUNTS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4,
  7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
];
const ORDERED: string[] = [...BOOKS].sort((a, b) => a.order - b.order).map((b) => b.code);
const CHAPTERS: Record<string, number> = Object.fromEntries(ORDERED.map((code, i) => [code, COUNTS[i] ?? 0]));

export function chapterCount(book: string): number {
  return CHAPTERS[book] ?? 0;
}

export function parseRouteRef(book: string, chapter: string): ChapterRef | null {
  const code = (book || "").toUpperCase();
  if (!bookByCode(code)) return null;
  if (!/^\d+$/.test(chapter || "")) return null;
  const n = Number(chapter);
  return n >= 1 && n <= chapterCount(code) ? { book: code, chapter: n } : null;
}

export function adjacentChapter(ref: ChapterRef, dir: -1 | 1): ChapterRef | null {
  const next = ref.chapter + dir;
  if (next >= 1 && next <= chapterCount(ref.book)) return { book: ref.book, chapter: next };
  const book = ORDERED[ORDERED.indexOf(ref.book) + dir];
  if (!book) return null;
  return { book, chapter: dir === 1 ? 1 : chapterCount(book) };
}

export function chapterLabel(ref: ChapterRef): string {
  return `${bookName(ref.book)} ${ref.chapter}`;
}

// Preferências por aparelho (localStorage). Chaves com prefixo do app.
export const LAST_READ_KEY = "tally.reader.last";
export const RECENT_KEY = "tally.reader.recent";
const FALLBACK: ChapterRef = { book: "JHN", chapter: 1 };

export function parseLastRead(raw: string | null): ChapterRef {
  if (!raw) return FALLBACK;
  try {
    const v = JSON.parse(raw) as { book?: unknown; chapter?: unknown };
    if (typeof v.book !== "string" || typeof v.chapter !== "number") return FALLBACK;
    return parseRouteRef(v.book, String(v.chapter)) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export function pushRecent(list: ChapterRef[], ref: ChapterRef): ChapterRef[] {
  const same = (a: ChapterRef): boolean => a.book === ref.book && a.chapter === ref.chapter;
  return [ref, ...list.filter((a) => !same(a))].slice(0, 3);
}

export function glossOf(l: LexShort | undefined): string {
  return (l?.gloss_pt || l?.gloss || "").trim();
}

export function isHebrew(strong: string): boolean {
  return strong.startsWith("H");
}

// Ocorrências: a RPC strong_occurrences devolve OSIS; o app fala USFM. Livro fora dos 66
// (apócrifo) é descartado.
export interface OccRow {
  book: string;
  chapter: number;
  n: number;
}
export interface OccBook {
  book: string;
  name: string;
  total: number;
  chapters: { chapter: number; n: number }[];
}

export function groupOccurrences(rows: OccRow[]): OccBook[] {
  const map = new Map<string, OccBook>();
  for (const r of rows) {
    const usfm = osisToUsfm(r.book);
    if (!usfm) continue;
    const b = map.get(usfm) ?? { book: usfm, name: bookName(usfm), total: 0, chapters: [] };
    b.total += r.n;
    b.chapters.push({ chapter: r.chapter, n: r.n });
    map.set(usfm, b);
  }
  return [...map.values()]
    .sort((a, b) => ORDERED.indexOf(a.book) - ORDERED.indexOf(b.book))
    .map((b) => ({ ...b, chapters: [...b.chapters].sort((x, y) => x.chapter - y.chapter) }));
}

// Área de trabalho: abas com chave estável. Abrir o que já está aberto só ativa.
export type WsTab = { kind: "word"; strong: string } | { kind: "verse"; verse: number } | { kind: "notes" } | { kind: "sermon" };
export interface Workspace {
  tabs: WsTab[];
  active: string | null;
}
export const MAX_TABS = 5;
export const EMPTY_WS: Workspace = { tabs: [], active: null };

export function tabKey(t: WsTab): string {
  if (t.kind === "word") return "word:" + t.strong;
  if (t.kind === "verse") return "verse:" + t.verse;
  return t.kind;
}

export function openTab(ws: Workspace, t: WsTab): Workspace {
  const key = tabKey(t);
  if (ws.tabs.some((x) => tabKey(x) === key)) return { tabs: ws.tabs, active: key };
  const tabs = [...ws.tabs, t];
  return { tabs: tabs.length > MAX_TABS ? tabs.slice(tabs.length - MAX_TABS) : tabs, active: key };
}

export function closeTab(ws: Workspace, key: string): Workspace {
  const i = ws.tabs.findIndex((x) => tabKey(x) === key);
  if (i < 0) return ws;
  const tabs = ws.tabs.filter((_, j) => j !== i);
  if (ws.active !== key) return { tabs, active: ws.active };
  const neighbor = tabs[i] ?? tabs[i - 1];
  return { tabs, active: neighbor ? tabKey(neighbor) : null };
}

// Gaveta do celular. Decide pelo peteleco (velocidade em px/ms, positivo = para baixo)
// antes da distância: um toque rápido basta, não precisa arrastar até o fim.
export type SheetState = "half" | "full";
const FLICK = 0.11;

export function sheetAfterDrag(state: SheetState, dy: number, velocity: number): SheetState | "closed" {
  const down = velocity > FLICK || dy > 120;
  const up = velocity < -FLICK || dy < -80;
  if (down) return state === "full" ? "half" : "closed";
  if (up) return "full";
  return state;
}

// Resistência progressiva ao arrastar além do limite (fórmula da Apple).
export function rubberband(overshoot: number, dimension: number): number {
  const c = 0.55;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}
