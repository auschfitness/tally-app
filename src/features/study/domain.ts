// Domínio de Study/Sermões. Rótulos, faixas, seções do canvas e regras puras
// portadas de src/views/sermons.js. Glossário PT-BR FIXADO (CLAUDE.md): Esboço,
// Ideia central, Notas, Ilustrações, Aplicação, Resposta de oração.
import type { Scripture, Sermon, SermonStatus, SermonVisibility, SeriesStatus } from "./types";

export const STATUS_LBL: Record<SermonStatus, string> = {
  draft: "Rascunho",
  preparing: "Preparando",
  ready: "Pronto",
  preached: "Pregado",
  archived: "Arquivado",
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

export const SERMON_STATUSES: SermonStatus[] = ["draft", "preparing", "ready", "preached", "archived"];

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

export interface SermonFilter {
  status: SermonStatus | null;
  campus: string | null;
  series: string | null; // id | "__none__" | null
}

// Filtra a biblioteca por status/campus/série (série "__none__" = sem série).
export function filterSermons(sermons: Sermon[], f: SermonFilter): Sermon[] {
  return sermons.filter(
    (s) =>
      (!f.status || s.status === f.status) &&
      (!f.campus || s.campus === f.campus) &&
      (!f.series || (f.series === "__none__" ? !s.series_id : s.series_id === f.series)),
  );
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

// --- Mapa de Escrituras (slice 2): cobertura dos 66 livros por uso real. ---
export interface Coverage {
  count: Record<string, number>; // code → nº de sermões distintos que usam o livro
  max: number;
}
export function coverage(scriptures: Scripture[]): Coverage {
  const by: Record<string, Set<string>> = {};
  for (const x of scriptures) (by[x.book] ?? (by[x.book] = new Set())).add(x.sermon_id);
  const count: Record<string, number> = {};
  let max = 0;
  for (const code of Object.keys(by)) {
    const n = by[code]!.size;
    count[code] = n;
    if (n > max) max = n;
  }
  return { count, max };
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

// --- Biblioteca v2 (spec 06, Erro nº 2) — atrás da flag `study.library_v2`. ---

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
