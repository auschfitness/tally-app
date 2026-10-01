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
  morph?: string | null;
  lemma?: string | null;
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

// Aspas retas do texto viram curvas (“ ” ‘ ’). Abre depois de início, espaço ou abertura;
// o resto fecha (inclui apóstrofo). O contexto atravessa os trechos do versículo.
export function curlyQuotes(spans: Span[]): Span[] {
  let prev = " ";
  return spans.map((s) => {
    const text = s.text.replace(/["']/g, (q, i: number, all: string) => {
      const before = i > 0 ? (all[i - 1] ?? " ") : prev;
      const opens = /[\s([{—“‘]/.test(before);
      return q === '"' ? (opens ? "“" : "”") : opens ? "‘" : "’";
    });
    prev = text.slice(-1) || prev;
    return { ...s, text };
  });
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
      spans: curlyQuotes([...list].sort((a, b) => a.position - b.position).map((w) => ({ text: w.text, strong: w.strong || null }))),
    }));
}

export function versesFromPlain(vs: { n: number; text: string }[]): ReaderVerse[] {
  return vs.map((v) => ({ n: v.n, spans: curlyQuotes([{ text: v.text, strong: null }]) }));
}

// Quebra os versículos em parágrafos: `starts` são os versículos que abrem parágrafo novo
// (src/lib/bible/paragraphs.json). Sem marcação, o capítulo sai num bloco só.
export function toParagraphs(verses: ReaderVerse[], starts: number[]): ReaderVerse[][] {
  const opens = new Set(starts);
  const out: ReaderVerse[][] = [];
  for (const v of verses) {
    const last = out[out.length - 1];
    if (!last || opens.has(v.n)) out.push([v]);
    else last.push(v);
  }
  return out;
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

// Capítulos recentes (seletor e menu lateral; grava o ChapterPicker). Lixo é ignorado.
export function parseRecent(raw: string | null): ChapterRef[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.flatMap((x: { book?: unknown; chapter?: unknown }) => {
      const r = typeof x?.book === "string" && typeof x?.chapter === "number" ? parseRouteRef(x.book, String(x.chapter)) : null;
      return r ? [r] : [];
    }).slice(0, 4);
  } catch {
    return [];
  }
}

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
  return [ref, ...list.filter((a) => !same(a))].slice(0, 4);
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

// O cartão do capítulo aberto mostra o mesmo número do contador "1 de N": a RPC conta
// palavras do grego, o contador conta trechos ligados no português (a ligação às vezes
// junta duas palavras num trecho). Só o capítulo aberto tem os trechos carregados; os
// outros ficam com a contagem do grego. n = 0 (nada carregado ainda) não mexe.
export function withChapterCount(books: OccBook[], at: ChapterRef, n: number): OccBook[] {
  if (n <= 0) return books;
  return books.map((b) => {
    if (b.book !== at.book) return b;
    const old = b.chapters.find((c) => c.chapter === at.chapter);
    if (!old) return b;
    return { ...b, total: b.total - old.n + n, chapters: b.chapters.map((c) => (c === old ? { ...c, n } : c)) };
  });
}

// Filtro da lista de ocorrências: texto casa com o nome do livro (sem acento, sem caixa);
// um número no fim ("mateus 20", "20") restringe aos capítulos com esse número.
export function filterOccurrences(books: OccBook[], query: string): OccBook[] {
  const plain = (t: string): string => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const m = /^(.*?)\s*(\d+)?$/.exec(plain(query));
  const name = m?.[1] ?? "";
  const chap = m?.[2] ? Number(m[2]) : null;
  return books.flatMap((b) => {
    if (!plain(b.name).includes(name)) return [];
    if (chap == null) return [b];
    const chapters = b.chapters.filter((c) => c.chapter === chap);
    return chapters.length ? [{ ...b, chapters }] : [];
  });
}

// Área de trabalho: abas com chave estável. Abrir o que já está aberto só ativa. A área
// sobrevive à troca de capítulo, então a aba Versículo guarda o próprio capítulo.
// A aba Palavra é UMA só (como no Raízes): tocar outra palavra troca o conteúdo.
// `key` identifica o trecho tocado no texto (realce); o resto descreve ESTA ocorrência.
export interface WordPick {
  strong: string;
  key: string;
  book: string;
  chapter: number;
  verse: number;
  text: string; // o trecho em português tocado ("gerou"); no modo Original, a glosa
  surface: string | null; // forma flexionada no original deste versículo
  translit: string | null;
  morph: string | null;
  // O versículo partido em volta da palavra tocada, para citar com ela marcada. Só no
  // modo Bíblia (no Original não há trecho em português).
  quote?: { before: string; word: string; after: string } | null;
}
export type WsTab =
  | ({ kind: "word" } & WordPick)
  | { kind: "verse"; book: string; chapter: number; verse: number }
  | { kind: "notes" }
  | { kind: "sermon" };
export interface Workspace {
  tabs: WsTab[];
  active: string | null;
}
export const MAX_TABS = 5;
export const EMPTY_WS: Workspace = { tabs: [], active: null };

export function tabKey(t: WsTab): string {
  if (t.kind === "word") return "word";
  if (t.kind === "verse") return `verse:${t.book}.${t.chapter}.${t.verse}`;
  return t.kind;
}

export function openTab(ws: Workspace, t: WsTab): Workspace {
  const key = tabKey(t);
  if (ws.tabs.some((x) => tabKey(x) === key)) return { tabs: ws.tabs.map((x) => (tabKey(x) === key ? t : x)), active: key };
  const tabs = [...ws.tabs, t];
  // Passou do limite: sai a mais antiga que não seja o Sermão (o editor não pode sumir).
  if (tabs.length > MAX_TABS) tabs.splice(tabs.findIndex((x) => x.kind !== "sermon"), 1);
  return { tabs, active: key };
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

// Velocidade de soltura (px/ms) só com as amostras dos últimos `windowMs`: um arrasto
// lento que termina num peteleco conta como peteleco.
export function releaseVelocity(samples: { y: number; t: number }[], windowMs = 80): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  const first = samples.find((p) => last.t - p.t <= windowMs) ?? last;
  return last.t === first.t ? 0 : (last.y - first.y) / (last.t - first.t);
}

// Palavra original correspondente ao n-ésimo trecho com este Strong no versículo
// (o mesmo Strong pode aparecer duas vezes: "gerou ... gerou").
export function originalFor(original: OrigWord[], verse: number, strong: string, nth: number): OrigWord | null {
  const same = original.filter((w) => w.verse === verse && w.strong === strong).sort((a, b) => a.position - b.position);
  return same[nth] ?? same[0] ?? null;
}

// 'G0976' → '976'; pontuação colada na forma do texto original sai.
export function strongNum(strong: string): string {
  return strong.replace(/^[GH]0*/, "");
}
export function cleanSurface(s: string): string {
  return s.replace(/[\s.,;:··;׃־]+$/u, "");
}

// Destaques (spec 08): uma cor por versículo; tocar na cor já aplicada tira o destaque.
export const HL_COLORS = ["yellow", "green", "blue", "pink", "orange"] as const;
export type HlColor = (typeof HL_COLORS)[number];
export const HL_LABEL: Record<HlColor, string> = { yellow: "Amarelo", green: "Verde", blue: "Azul", pink: "Rosa", orange: "Laranja" };

export function isHlColor(v: unknown): v is HlColor {
  return typeof v === "string" && (HL_COLORS as readonly string[]).includes(v);
}

// Várias seleções: se todos já têm a cor tocada, tira; senão, aplica em todos.
export function colorFor(currents: (HlColor | undefined)[], picked: HlColor): HlColor | null {
  return currents.every((c) => c === picked) ? null : picked;
}

// Referência da seleção: corridas consecutivas viram intervalo (João 3:16-18, 20).
export function selectionLabel(ref: ChapterRef, verses: number[]): string {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (sorted[j + 1] === (sorted[j] ?? 0) + 1) j++;
    runs.push(j > i ? `${sorted[i]}-${sorted[j]}` : `${sorted[i]}`);
    i = j + 1;
  }
  return `${chapterLabel(ref)}:${runs.join(", ")}`;
}

// Texto para a área de transferência: versículos na ordem, depois a referência e a versão.
export function copyText(ref: ChapterRef, verses: ReaderVerse[], selected: number[]): string {
  const pick = new Set(selected);
  const body = verses
    .filter((v) => pick.has(v.n))
    .map((v) => v.spans.map((s) => s.text).join("").trim())
    .join(" ");
  return `${body}\n— ${selectionLabel(ref, selected)} (Bíblia Livre)`;
}

// Notas do versículo pedido primeiro; o resto mantém a ordem (mais recentes antes).
export function notesFirst<T extends { verse_start: number | null }>(notes: T[], verse: number | null): T[] {
  if (verse == null) return notes;
  return [...notes.filter((n) => n.verse_start === verse), ...notes.filter((n) => n.verse_start !== verse)];
}

// Dicionário UBS (spec 09). Um sentido do verbete, já traduzido; `here` = a UBS diz que é
// o sentido usado no versículo aberto.
export interface UbsSense {
  sense_id: string;
  lemma: string;
  entry_code: string | null;
  ord: number;
  glosses: string[];
  definition: string | null;
  comments: string | null;
  domains: string[];
  subdomains: string[];
}

// O sentido deste versículo primeiro (marcado), depois os demais na ordem do verbete.
// Sem marca da UBS para o versículo, fica a ordem do verbete e nenhum é "deste versículo".
export function orderSenses(senses: UbsSense[], hereIds: string[]): (UbsSense & { here: boolean })[] {
  const here = new Set(hereIds);
  return senses
    .map((s) => ({ ...s, here: here.has(s.sense_id) }))
    .sort((a, b) => Number(b.here) - Number(a.here) || a.ord - b.ord || a.sense_id.localeCompare(b.sense_id));
}

const ABNT_MONTHS = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
export function ubsCitation(lemma: string, entryCode: string | null, today: Date): string {
  const at = `${today.getDate()} ${ABNT_MONTHS[today.getMonth()]} ${today.getFullYear()}`;
  return `SOCIEDADES BÍBLICAS UNIDAS. Dicionário Grego do Novo Testamento. Verbete ${lemma}${entryCode ? ` (${entryCode})` : ""}. Tradução Tally do original em espanhol. Licença CC BY-SA 4.0. Disponível em: https://github.com/ubsicap/ubs-open-license. Acesso em: ${at}.`;
}
