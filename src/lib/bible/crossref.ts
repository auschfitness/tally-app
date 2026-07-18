// Referências cruzadas (Treasury of Scripture Knowledge via openbible.info, CC BY).
// Lógica PURA de agregação: recebe as linhas cruas da tabela `cross_references` (códigos
// OSIS) e devolve chips "Textos relacionados" já no código USFM do app, dedupados por
// destino (mantendo a maior votação), ordenados por relevância (votes) e limitados.
// O acesso ao banco fica no componente; aqui é só mapeamento/ordenação (testável).
import { bookName } from "./books";
import { osisToUsfm } from "./osis";

// Linha crua vinda de `cross_references` (destino em OSIS).
export interface CrossRefRow {
  to_book: string;
  to_chapter: number;
  to_verse_start: number;
  to_verse_end: number | null;
  votes: number;
}
// Chip pronto para a UI (destino em USFM + rótulo PT).
export interface RelatedRef {
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  label: string;
  votes: number;
}

function keyOf(book: string, ch: number, vs: number, ve: number | null): string {
  return `${book}-${ch}-${vs}-${ve ?? ""}`;
}

// Agrega as referências cruzadas de uma passagem em chips de destino.
export function aggregateRelated(rows: CrossRefRow[], limit = 10): RelatedRef[] {
  const best = new Map<string, RelatedRef>();
  for (const r of rows) {
    const usfm = osisToUsfm(r.to_book);
    if (!usfm) continue; // destino fora dos 66 (ex.: apócrifo) — não abrimos, ignora
    const vs = r.to_verse_start;
    const ve = r.to_verse_end && r.to_verse_end !== vs ? r.to_verse_end : null;
    const k = keyOf(usfm, r.to_chapter, vs, ve);
    const votes = r.votes || 0;
    const existing = best.get(k);
    if (!existing) {
      const label = bookName(usfm) + " " + r.to_chapter + ":" + vs + (ve ? "-" + ve : "");
      best.set(k, { book: usfm, chapter: r.to_chapter, verse_start: vs, verse_end: ve, label, votes });
    } else if (votes > existing.votes) {
      existing.votes = votes;
    }
  }
  return [...best.values()]
    .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label))
    .slice(0, limit);
}
