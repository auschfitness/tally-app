// Versículos que abrem parágrafo, por livro (USFM) e capítulo. A Bíblia Livre não marca
// parágrafo; a divisão vem da World English Bible (domínio público), gerada por
// scripts/build-paragraphs.mjs. Só servidor: o JSON (~28 KB) não vai para o cliente inteiro.
import data from "./paragraphs.json";

const PARAGRAPHS: Record<string, Record<string, number[]> | undefined> = data;

export function paragraphStartsOf(book: string, chapter: number): number[] {
  return PARAGRAPHS[book]?.[String(chapter)] ?? [];
}
