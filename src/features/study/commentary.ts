// Formatação da aba Comentário (Frente C, spec 09). Funções puras: recebem as linhas de
// bible_commentary e devolvem blocos prontos para a tela. Nada aqui toca no banco.
//
// JFB: parágrafos separados por linha em branco. Cada parágrafo costuma abrir com a frase
// citada do versículo seguida de ":" (vira negrito). Títulos de seção vêm em CAIXA ALTA
// com a referência entre parênteses: "A PALAVRA FEITA CARNE. (Jo 1.1-14)".
// Tyndale: um texto corrido por linha, com marcadores de versículo no início de frase
// ("1.1-18 ...", "1.1 ...") e "•" separando notas do mesmo versículo.

export type CmtSource = "jfb" | "tyndale";
export const CMT_SOURCES: CmtSource[] = ["jfb", "tyndale"];

export interface CmtRow {
  id: string;
  source: string;
  verse_start: number;
  verse_end: number;
  kind: string;
  text_pt: string;
}

export type CmtBlock =
  | { type: "heading"; title: string; ref: string | null }
  | { type: "label"; text: string }
  | { type: "para"; lead: string | null; text: string };

export interface CmtView {
  blocks: CmtBlock[];
  start: number;
  end: number;
}

const PROPER = new Set([
  "andré", "batista", "betânia", "cafarnaum", "cristo", "dedicação", "deus", "espírito",
  "evangelho", "filipe", "galileia", "jerusalém", "jesus", "joão", "jordão", "lázaro",
  "maria", "natanael", "nicodemos", "páscoa", "pedro", "pilatos", "samaria", "samaritanos",
  "senhor", "sicar", "simão", "tabernáculos",
  "abraão", "adão", "davi", "efésios", "efeso", "éfeso", "gentios", "israel", "judeus", "lei", "mateus",
  "moisés", "paulo", "roma", "romanos",
]);

const cap = (w: string): string => w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1);

/** "A PALAVRA FEITA CARNE" -> "A Palavra feita carne". */
export function headingCase(caps: string): string {
  const words = caps.trim().toLocaleLowerCase("pt-BR").split(/(\s+)/);
  let prev = "";
  return words
    .map((tok, i) => {
      if (/^\s+$/.test(tok)) return tok;
      const core = tok.replace(/[^\p{L}-]/gu, "");
      const keep = i === 0 || PROPER.has(core) || (core === "palavra" && prev === "a");
      prev = core;
      return keep ? tok.replace(core, cap(core)) : tok;
    })
    .join("");
}

const HEADING = /^(.+?)\.?\s*\(([1-3]?\p{L}{1,3}\s+\d+\.\d+(?:-\d+)?)\)\s*$/u;
const isCaps = (s: string): boolean => /\p{Lu}/u.test(s) && s === s.toLocaleUpperCase("pt-BR");

/** Um parágrafo do JFB: título de seção ou parágrafo com a frase citada em destaque. */
export function jfbBlock(p: string): CmtBlock {
  const m = HEADING.exec(p);
  if (m && m[1] && isCaps(m[1])) return { type: "heading", title: headingCase(m[1]), ref: m[2] ? m[2].replace(/\s+/, " ") : null };
  const i = p.indexOf(":");
  if (i > 0 && i <= 60) return { type: "para", lead: p.slice(0, i).trim(), text: p.slice(i) };
  return { type: "para", lead: null, text: p };
}

export function jfbBlocks(text: string): CmtBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(jfbBlock);
}

export interface TynSegment {
  label: string | null; // "Jo 1.1-18"
  start: number | null;
  end: number | null;
  crossChapter: boolean;
  paras: string[];
}

const MARKER = /(^|[.!?…”")\]•]\s+)(\d{1,3})\.(\d{1,3})(?:-(\d{1,3})(?:\.(\d{1,3}))?)?(?=\s)/gu;

/** Quebra um texto Tyndale nos marcadores de versículo do capítulo. */
export function tyndaleSegments(text: string, chapter: number): TynSegment[] {
  const cuts: { at: number; body: number; seg: Omit<TynSegment, "paras"> }[] = [];
  for (const m of text.matchAll(MARKER)) {
    if (Number(m[2]) !== chapter) continue;
    const prefix = m[1] ?? "";
    const m0 = m[0] ?? "";
    const at = (m.index ?? 0) + prefix.length;
    const start = Number(m[3]);
    const endCh = m[5] ? Number(m[4]) : chapter;
    const endV = m[5] ? Number(m[5]) : m[4] ? Number(m[4]) : start;
    const crossChapter = endCh !== chapter;
    const raw = text.slice(at, (m.index ?? 0) + m0.length);
    cuts.push({ at, body: (m.index ?? 0) + m0.length, seg: { label: `Jo ${raw}`, start, end: crossChapter ? start : endV, crossChapter } });
  }
  const split = (s: string): string[] => s.split(/\s*•\s*/).map((x) => x.trim()).filter(Boolean);
  const out: TynSegment[] = [];
  const head = text.slice(0, cuts[0]?.at ?? text.length);
  if (split(head).length) out.push({ label: null, start: null, end: null, crossChapter: false, paras: split(head) });
  cuts.forEach((c, i) => {
    const body = text.slice(c.body, cuts[i + 1]?.at ?? text.length);
    out.push({ ...c.seg, paras: split(body) });
  });
  return out;
}

export type CmtChapterBlock = CmtBlock & { anchor?: { start: number; end: number } };

/** Devolve todos os blocos da fonte no capítulo, na ordem; o primeiro bloco de cada trecho leva anchor. */
export function chapterCommentary(
  rows: CmtRow[],
  source: CmtSource,
  chapter: number,
): { blocks: CmtChapterBlock[] } {
  const seen = new Set<string>();
  const mine = rows.filter((r) => r.source === source && !seen.has(r.id) && seen.add(r.id));
  const blocks: CmtChapterBlock[] = [];

  if (source === "jfb") {
    const intros = mine.filter((r) => r.kind === "intro");
    const verses = mine
      .filter((r) => r.kind !== "intro")
      .sort((a, b) => a.verse_start - b.verse_start || a.verse_end - b.verse_end);
    const ordered = [...intros, ...verses];

    for (const r of ordered) {
      const bList = jfbBlocks(r.text_pt);
      const first = bList[0];
      if (!first) continue;
      blocks.push({
        ...first,
        anchor: { start: r.verse_start, end: r.verse_end },
      });
      for (let i = 1; i < bList.length; i++) {
        const b = bList[i];
        if (b) blocks.push(b);
      }
    }
    return { blocks };
  }

  // Tyndale: cada segmento de tyndaleSegments na ordem
  const ordered = mine.slice().sort((a, b) => a.verse_start - b.verse_start || a.verse_end - b.verse_end);
  for (const r of ordered) {
    const segs = tyndaleSegments(r.text_pt, chapter);
    for (const s of segs) {
      const firstPara = s.paras[0];
      if (!firstPara) continue;
      const start = s.start ?? r.verse_start;
      const end = s.end ?? r.verse_end;
      blocks.push({
        type: "para",
        lead: null,
        text: firstPara,
        anchor: { start, end },
      });
      for (let i = 1; i < s.paras.length; i++) {
        const p = s.paras[i];
        if (p) {
          blocks.push({
            type: "para",
            lead: null,
            text: p,
          });
        }
      }
    }
  }
  return { blocks };
}

/** O que a aba mostra para uma fonte e um versículo (null = capítulo, só introdução). */
export function pickCommentary(rows: CmtRow[], source: CmtSource, verse: number | null, chapter: number): CmtView | null {
  const seen = new Set<string>();
  const mine = rows.filter((r) => r.source === source && !seen.has(r.id) && seen.add(r.id));
  if (source === "jfb") {
    const hit = verse == null
      ? mine.filter((r) => r.kind === "intro")
      : mine.filter((r) => r.verse_start <= verse && r.verse_end >= verse);
    if (!hit.length) return null;
    return {
      blocks: hit.flatMap((r) => jfbBlocks(r.text_pt)),
      start: Math.min(...hit.map((r) => r.verse_start)),
      end: Math.max(...hit.map((r) => r.verse_end)),
    };
  }
  if (verse == null) return null;
  const blocks: CmtBlock[] = [];
  let start = Infinity;
  let end = -Infinity;
  for (const r of mine) {
    for (const s of tyndaleSegments(r.text_pt, chapter)) {
      const a = s.start ?? r.verse_start;
      const b = s.end ?? r.verse_end;
      const covers = s.crossChapter ? a === verse : a <= verse && b >= verse;
      if (!covers) continue;
      if (s.label) blocks.push({ type: "label", text: s.label });
      for (const p of s.paras) blocks.push({ type: "para", lead: null, text: p });
      start = Math.min(start, a);
      end = Math.max(end, b);
    }
  }
  return blocks.length ? { blocks, start, end } : null;
}

export const CMT_NAME: Record<CmtSource, string> = { jfb: "JFB", tyndale: "Tyndale" };
export const CMT_CREDIT: Record<CmtSource, string> = {
  jfb: "Jamieson-Fausset-Brown, 1871. Domínio público, traduzido do inglês.",
  tyndale: "Tyndale Open Study Notes. CC BY-SA 4.0, traduzido do inglês.",
};
