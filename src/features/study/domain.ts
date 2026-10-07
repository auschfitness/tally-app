// Domínio de Study/Sermões. Rótulos, faixas, seções do canvas e regras puras
// portadas de src/views/sermons.js. Glossário PT-BR FIXADO (CLAUDE.md): Esboço,
// Ideia central, Notas, Ilustrações, Aplicação, Resposta de oração.
import type { Scripture, Sermon, SermonStatus, SermonVisibility, SeriesStatus, StudyNote, TextNote } from "./types";
import { BOOKS, bookName } from "@/lib/bible/books";
import { osisToUsfm } from "@/lib/bible/osis";
import { buildReference, parseRefs } from "@/lib/bible/parse";

// Spec 10: na interface só existem 3 estados escolhíveis. O banco guarda 5 valores:
// `preparing` aparece como Rascunho e `archived` não é um estado, é a ação "Arquivar".
export const STATUS_LBL: Record<SermonStatus, string> = {
  draft: "Rascunho",
  preparing: "Rascunho",
  ready: "Pronto",
  preached: "Pregado",
  archived: "Arquivado",
};
export const CHOOSABLE_STATUSES: SermonStatus[] = ["draft", "ready", "preached"];
// Cor do ponto de status: Rascunho cinza, Pronto azul, Pregado verde (Arquivado cinza claro).
export const STATUS_COLOR: Record<SermonStatus, string> = {
  draft: "var(--text-2)",
  preparing: "var(--text-2)",
  ready: "var(--blue)",
  preached: "var(--green)",
  archived: "var(--border)",
};
export const STATUS_BAND: Record<SermonStatus, string> = {
  draft: "attention",
  preparing: "attention",
  ready: "healthy",
  preached: "healthy",
  archived: "risk",
};
export const VIS_LBL: Record<SermonVisibility, string> = {
  private: "Privado",
  leadership: "Liderança",
  church: "Igreja",
  public: "Público",
};
export const SERIES_LBL: Record<SeriesStatus, string> = {
  planning: "Planejando",
  active: "Ativa",
  completed: "Concluída",
  archived: "Arquivada",
};
export const SERIES_BAND: Record<SeriesStatus, string> = {
  planning: "attention",
  active: "healthy",
  completed: "healthy",
  archived: "risk",
};

export const NOTE_SCOPE_LBL: Record<string, string> = { personal: "Pessoal", shared: "Compartilhada" };

// "graça, pastoreio" → ["graça","pastoreio"] (sem vazios). Portado de parseTags.
export function parseTags(s: string): string[] {
  return (s || "").split(",").map((t) => t.trim()).filter(Boolean);
}

// Seções do canvas (dentro de content). `notes` é o corpo aberto; as demais são
// estrutura opcional (aparecem quando têm conteúdo ou quando o pastor as adiciona).
export interface SectionDef {
  key: "outline" | "notes" | "illustrations" | "application" | "prayer_response";
  label: string;
  ph: string;
}
export type SectionKey = SectionDef["key"];
// Seção de destino padrão ao "Adicionar ao sermão" (o pastor pode escolher outra).
export const DEFAULT_SECTION: SectionKey = "notes";
export const SECTIONS: SectionDef[] = [
  { key: "outline", label: "Esboço", ph: "Introdução, pontos, sub-pontos…" },
  { key: "notes", label: "Notas", ph: "Texto livre de estudo" },
  { key: "illustrations", label: "Ilustrações", ph: "Histórias, exemplos, imagens" },
  { key: "application", label: "Aplicação", ph: "Como isso toca a vida da igreja" },
  { key: "prayer_response", label: "Resposta de oração", ph: "Como responder a Deus a partir deste texto" },
];
// Seções opcionais (todas menos o corpo aberto `notes`).
export const OPTIONAL_SECTIONS: SectionDef[] = SECTIONS.filter((s) => s.key !== "notes");

// Filtros da biblioteca (spec 9): status exclusivo (Todos | Em preparo | Pregados) que
// soma com série e livro. O livro sai da passagem principal do sermão.
export type SermonStatusFilter = "preparo" | "pregados" | null;
export interface SermonFilter {
  status: SermonStatusFilter;
  seriesId: string | null;
  book: string | null; // USFM
}

// Livros (USFM, sem repetir) citados na passagem principal.
export function sermonBooks(s: Sermon): string[] {
  return [...new Set(parseRefs(s.main_passage).map((r) => r.book))];
}

export function filterSermons(sermons: Sermon[], f: SermonFilter): Sermon[] {
  return sermons.filter(
    (s) =>
      (f.status !== "preparo" || OPEN.has(s.status)) &&
      (f.status !== "pregados" || s.status === "preached") &&
      (!f.seriesId || s.series_id === f.seriesId) &&
      (!f.book || sermonBooks(s).includes(f.book)),
  );
}

// Só os livros que têm sermão, na ordem da Bíblia, com nº de sermões.
export function booksWithSermons(sermons: Sermon[]): { code: string; name: string; count: number }[] {
  const n = new Map<string, number>();
  for (const s of sermons) for (const b of sermonBooks(s)) n.set(b, (n.get(b) ?? 0) + 1);
  return BOOKS.filter((b) => n.has(b.code)).map((b) => ({ code: b.code, name: b.pt, count: n.get(b.code)! }));
}

// Ordena sermões por data (desc) do jeito do hydrate legado (sem data ao fim).
export function sortSermonsByDate(sermons: Sermon[], dir: "asc" | "desc" = "desc"): Sermon[] {
  const mul = dir === "desc" ? -1 : 1;
  return sermons.slice().sort((a, b) => {
    if (!a.sermon_date && !b.sermon_date) return 0;
    if (!a.sermon_date) return 1;
    if (!b.sermon_date) return -1;
    return mul * a.sermon_date.localeCompare(b.sermon_date);
  });
}

// Sermões (ids) que já usaram um livro+capítulo, exceto o sermão atual. Só dado real.
export function sermonIdsUsing(scriptures: Scripture[], book: string, chapter: number, exceptSermonId: string | null): string[] {
  const ids = new Set<string>();
  for (const x of scriptures) {
    if (x.book === book && x.chapter === chapter && x.sermon_id !== exceptSermonId) ids.add(x.sermon_id);
  }
  return [...ids];
}

// --- Fase 4: lentes do estudo → blocos para o sermão (lógica PURA, testável) ---
// Cada lente do hub "Estudo do Texto" vira um bloco de texto bem formatado, anexado ao
// fim da seção escolhida do canvas. A montagem do texto fica aqui; o acesso a dados e a
// escolha de seção ficam nos componentes.

// Anexa um bloco ao fim de uma seção, preservando o que já existe (2 linhas de respiro).
export function appendBlock(existing: string, block: string): string {
  const b = (block ?? "").trim();
  if (!b) return existing;
  return (existing ? existing.replace(/\s+$/, "") + "\n\n" : "") + b;
}

// Traduções: "Referência (SIGLA)\n<texto dos versículos>".
export function buildTranslationBlock(refLabel: string, short: string, verses: { n: number; text: string }[]): string {
  const text = verses.map((v) => v.n + " " + v.text).join(" ");
  return `${refLabel} (${short})\n${text}`;
}

// Referências: "Textos relacionados a <ref>:\n- <ref1>\n- <ref2>…".
export function buildRelatedBlock(refLabel: string, related: { label: string }[]): string {
  const lines = related.map((r) => `- ${r.label}`);
  return `Textos relacionados a ${refLabel}:` + (lines.length ? "\n" + lines.join("\n") : "");
}

// Palavras-chave: "<lema> (<Strong>) — <significado> · aparece <N>× na Bíblia".
export function buildKeywordBlock(k: { lemma: string; strong: string; meaning: string; occurrences: number | null }): string {
  let s = `${k.lemma} (${k.strong})`;
  if (k.meaning) s += ` — ${k.meaning}`;
  if (k.occurrences != null) s += ` · aparece ${k.occurrences}× na Bíblia`;
  return s;
}

// Original: "<surface> (<Strong>) — <lema>; <morfologia decodificada>".
export function buildOriginalBlock(surface: string, strong: string | null, lemma: string | null, morphDecoded: string): string {
  let head = surface;
  if (strong) head += ` (${strong})`;
  const detail = [lemma, morphDecoded].map((x) => (x || "").trim()).filter(Boolean).join("; ");
  return detail ? `${head} — ${detail}` : head;
}

// Contexto: "<title_pt> — <theme>\n<summary>".
export function buildContextBlock(title: string, theme: string | null, summary: string | null): string {
  let head = title;
  if (theme) head += ` — ${theme}`;
  return summary ? `${head}\n${summary}` : head;
}

// --- Biblioteca de Sermões (specs 06 e 10). ---

// Os status que ainda são TRABALHO. `preached`/`archived` são histórico: não entram
// no padrão do filtro nem no bloco "Continuando".
export const OPEN_STATUSES: SermonStatus[] = ["draft", "preparing", "ready"];
const OPEN = new Set<SermonStatus>(OPEN_STATUSES);

// O sermão que o pastor está continuando: o mais recentemente SALVO entre os que
// ainda estão em aberto. `updated_at` (e não a data de pregação) porque retomar é
// sobre o trabalho tocado; o filtro por status é o que impede que abrir um sermão
// antigo só para reler o promova a "Continuando". Nenhum em aberto → null, e o bloco
// simplesmente não aparece (nada de estado vazio decorativo no lugar).
export function inProgressSermon(sermons: Sermon[]): Sermon | null {
  let best: Sermon | null = null;
  for (const s of sermons) {
    if (!OPEN.has(s.status)) continue;
    if (!best || s.updated_at > best.updated_at) best = s;
  }
  return best;
}

// O corpo do sermão está vazio? Checa TODAS as seções do canvas, não só `notes` —
// quem escreveu só no Esboço escreveu o sermão.
export function isBodyEmpty(s: Sermon): boolean {
  return SECTIONS.every((sec) => !String(s.content?.[sec.key] ?? "").trim());
}

// O que falta neste sermão, em palavras do pastor. Sai de dado real; lista vazia
// quando não falta nada (e aí a linha some da tela).
export function missingParts(s: Sermon): string[] {
  const out: string[] = [];
  if (!s.main_passage.trim()) out.push("falta a passagem");
  if (!s.big_idea.trim()) out.push("falta a ideia central");
  if (isBodyEmpty(s)) out.push("o corpo ainda está em branco");
  return out;
}

// Minúsculas, sem acento — para comparar busca com texto digitado em PT-BR.
function fold(s: string): string {
  return (s || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Busca na biblioteca: título, passagem, ideia central e NOME DA SÉRIE (é por isso
// que a série não precisa de lugar no filtro). Consulta vazia → devolve a lista
// inteira, e quem chama decide o que fazer com ela.
export function searchSermons(sermons: Sermon[], q: string, seriesTitleById: Map<string, string>): Sermon[] {
  const needle = fold(q).trim();
  if (!needle) return sermons;
  return sermons.filter((s) => {
    const hay = [s.title, s.main_passage, s.big_idea, (s.series_id && seriesTitleById.get(s.series_id)) || ""];
    return hay.some((h) => fold(h).includes(needle));
  });
}

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "2026-09-14" → "14 set"; vazio/inválido → "".
export function shortDate(iso: string | null | undefined): string {
  const [, m, d] = (iso || "").split("-");
  const mes = MES[Number(m) - 1];
  return mes && d ? `${Number(d)} ${mes}` : "";
}

// "2026-10-12" → "12 out 2026"; vazio/inválido → "".
export function longDate(iso: string | null | undefined): string {
  const [y, m, d] = (iso || "").split("-");
  const mes = MES[Number(m) - 1];
  return y && mes && d ? `${Number(d)} ${mes} ${y}` : "";
}

// A nota do texto cai na passagem? Intervalos de versículos que se cruzam. Nota sem
// versículo (capítulo inteiro) ou passagem sem versículo (capítulo inteiro) sempre contam.
export function noteOverlapsPassage(
  note: { verse_start: number | null; verse_end: number | null },
  passage: { verse_start: number | null; verse_end: number | null },
): boolean {
  if (note.verse_start == null || passage.verse_start == null) return true;
  const ne = note.verse_end ?? note.verse_start;
  const pe = passage.verse_end ?? passage.verse_start;
  return note.verse_start <= pe && passage.verse_start <= ne;
}

// Período de uma série: "ago a out 2026", "nov 2025 a jun 2026", "ago 2026" (mesmo mês),
// "desde ago 2026" (sem fim). Sem início → "".
export function seriesPeriod(start: string | null | undefined, end: string | null | undefined): string {
  const [y1, m1] = (start || "").split("-");
  const a = MES[Number(m1) - 1];
  if (!y1 || !a) return "";
  const [y2, m2] = (end || "").split("-");
  const b = MES[Number(m2) - 1];
  if (!y2 || !b) return `desde ${a} ${y1}`;
  if (y1 === y2) return m1 === m2 ? `${a} ${y1}` : `${a} a ${b} ${y1}`;
  return `${a} ${y1} a ${b} ${y2}`;
}

// "editado há 2 h", "editado ontem", "editado em 14 set". `now` por parâmetro p/ teste.
export function editedAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return "";
  const min = Math.floor((now.getTime() - t) / 60000);
  if (min < 1) return "editado agora";
  if (min < 60) return `editado há ${min} min`;
  if (min < 1440) return `editado há ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / 1440);
  if (dias === 1) return "editado ontem";
  if (dias < 30) return `editado há ${dias} dias`;
  return `editado em ${shortDate(iso.slice(0, 10))}`;
}

// Biblioteca "Por data": em aberto (menos o destaque), pregados por ano (mais novo
// primeiro; sem data no fim) e arquivados.
export interface LibraryGroups {
  open: Sermon[];
  preached: { year: string; items: Sermon[] }[];
  archived: Sermon[];
}
export function libraryGroups(sermons: Sermon[], exceptId: string | null): LibraryGroups {
  const open = sermons
    .filter((s) => OPEN.has(s.status) && s.id !== exceptId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const byYear = new Map<string, Sermon[]>();
  for (const s of sortSermonsByDate(sermons.filter((x) => x.status === "preached"))) {
    const y = s.sermon_date.slice(0, 4);
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(s);
  }
  const preached = [...byYear.entries()].map(([year, items]) => ({ year, items }));
  preached.sort((a, b) => (a.year && b.year ? b.year.localeCompare(a.year) : a.year ? -1 : b.year ? 1 : 0));
  return { open, preached, archived: sortSermonsByDate(sermons.filter((s) => s.status === "archived")) };
}

// --- Lixeira (m57): excluir = deleted_at; some de vez depois de TRASH_DAYS. ---
export const TRASH_DAYS = 30;
export type TrashKind = "sermon" | "note" | "text_note";
export const TRASH_TABLE = { sermon: "sermons", note: "study_notes", text_note: "study_text_notes" } as const;
export const TRASH_KIND_LBL: Record<TrashKind, string> = { sermon: "Sermão", note: "Nota", text_note: "Nota no texto" };
export interface TrashItem {
  kind: TrashKind;
  id: string;
  title: string;
  deleted_at: string;
}

// Dias que faltam para o item sumir (0 = some hoje). Arredonda para cima: excluído
// há 1 hora ainda tem 30 dias.
export function trashDaysLeft(deletedAt: string, now: Date = new Date()): number {
  const ms = new Date(deletedAt).getTime() + TRASH_DAYS * 86400000 - now.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Limite para apagar de vez: o que foi excluído antes disto já passou dos 30 dias.
export function trashCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - TRASH_DAYS * 86400000).toISOString();
}

// --- Notas (spec 10 §5): as do texto bíblico e as soltas numa lista só ---
export interface NoteItem {
  key: string;
  kind: "text" | "loose";
  id: string;
  label: string; // referência ("João 2:6") ou título da nota solta
  body: string;
  at: string; // ISO, para ordenar e agrupar
  book: string | null; // USFM; só nota do texto
  chapter: number | null;
  verse: number | null;
  verseEnd: number | null;
  text: string; // texto inteiro da nota solta, para reabrir na folha
}

// Texto livre → título (1ª linha, até 80 letras) + conteúdo (o resto; nada se perde).
export function splitNote(text: string): { title: string; content: string } {
  const t = (text || "").trim();
  const nl = t.indexOf("\n");
  const first = nl < 0 ? t : t.slice(0, nl);
  if (first.length <= 80) return { title: first.trim(), content: nl < 0 ? "" : t.slice(nl + 1).trim() };
  return { title: first.slice(0, 80).trimEnd(), content: t.slice(first.slice(0, 80).length).trim() };
}

export function joinNote(title: string, content: string): string {
  return [title.trim(), content.trim()].filter(Boolean).join("\n");
}

// ponytail: nota de livro fora dos 66 (apócrifos) fica de fora; o app não abre esses capítulos.
export function mergeNotes(textNotes: TextNote[], loose: StudyNote[]): NoteItem[] {
  const out: NoteItem[] = [];
  for (const n of textNotes) {
    const book = osisToUsfm(n.book);
    if (!book) continue;
    out.push({
      key: "t" + n.id,
      kind: "text",
      id: n.id,
      label: n.chapter ? buildReference(book, n.chapter, n.verse_start, n.verse_end) : bookName(book),
      body: n.body,
      at: n.updated_at,
      book,
      chapter: n.chapter || null,
      verse: n.verse_start,
      verseEnd: n.verse_end,
      text: n.body,
    });
  }
  for (const n of loose) {
    const sp = n.title.trim() ? { title: n.title.trim(), content: n.content.trim() } : splitNote(n.content);
    out.push({
      key: "l" + n.id,
      kind: "loose",
      id: n.id,
      label: sp.title || "(sem título)",
      body: sp.content,
      at: n.updated_at,
      book: null,
      chapter: null,
      verse: null,
      verseEnd: null,
      text: joinNote(n.title, n.content),
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function searchNotes(items: NoteItem[], q: string): NoteItem[] {
  const needle = fold(q).trim();
  if (!needle) return items;
  return items.filter((n) => fold(n.label).includes(needle) || fold(n.body).includes(needle));
}

const MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DAY_MS = 86_400_000;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "Hoje", "Esta semana" (últimos 6 dias), "Este mês", senão "agosto de 2026" (data local).
export function noteBucket(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((dayStart(now) - dayStart(d)) / DAY_MS);
  if (days <= 0) return "Hoje";
  if (days < 7) return "Esta semana";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "Este mês";
  const m = MES_LONGO[d.getMonth()]!;
  return `${m[0]!.toUpperCase()}${m.slice(1)} de ${d.getFullYear()}`;
}

// Já em ordem decrescente de data: os grupos saem contíguos.
export function groupNotesByDate(items: NoteItem[], now: Date = new Date()): { label: string; items: NoteItem[] }[] {
  const out: { label: string; items: NoteItem[] }[] = [];
  for (const n of [...items].sort((a, b) => b.at.localeCompare(a.at))) {
    const label = noteBucket(n.at, now);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(n);
    else out.push({ label, items: [n] });
  }
  return out;
}

// Ordem da Bíblia; dentro do livro, capítulo e versículo. Soltas no fim ("Sem passagem").
export function groupNotesByBook(items: NoteItem[]): { code: string | null; label: string; items: NoteItem[] }[] {
  const order = new Map(BOOKS.map((b) => [b.code, b.order]));
  const by = new Map<string, NoteItem[]>();
  const none: NoteItem[] = [];
  for (const n of items) {
    if (!n.book) none.push(n);
    else by.set(n.book, [...(by.get(n.book) ?? []), n]);
  }
  const out: { code: string | null; label: string; items: NoteItem[] }[] = [...by.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999))
    .map(([code, list]) => ({
      code,
      label: bookName(code),
      items: list.sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0) || (a.verse ?? 0) - (b.verse ?? 0) || b.at.localeCompare(a.at)),
    }));
  if (none.length) out.push({ code: null, label: "Sem passagem", items: none.sort((a, b) => b.at.localeCompare(a.at)) });
  return out;
}

// Data curta da linha: "14 set"; com ano se não for o atual ("14 set 2025").
export function noteDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${d.getDate()} ${MES[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// Arrastar a nota aberta no celular para a direita: fecha se passou da metade da tela
// ou se o dedo saiu rápido para a direita (um "peteleco" basta, sem exigir distância).
export const SWIPE_FLICK = 0.11; // px/ms
export function swipeCloses(dx: number, velocity: number, width: number): boolean {
  if (dx <= 0) return false;
  return dx > width / 2 || velocity > SWIPE_FLICK;
}
