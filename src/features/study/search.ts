// Busca por palavra na Bíblia: destaque das palavras achadas no texto do versículo.
// O banco decide QUAIS versículos batem (português, sem acento, com radical); aqui só
// marcamos onde, por aproximação: mesma raiz sem acento ("graças" marca "graça").

export interface Seg {
  text: string;
  hit: boolean;
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Termos da busca: tira aspas e operadores (-palavra, "or"), descarta palavras curtas
// ("de", "da") que marcariam meio versículo.
export function searchTerms(q: string): string[] {
  return [...new Set(
    fold(q)
      .replace(/["“”]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !w.startsWith("-") && w !== "or")
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter((w) => w.length >= 3),
  )];
}

const stem = (t: string) => (t.length <= 4 ? t : t.slice(0, Math.max(4, t.length - 2)));

export function highlight(text: string, terms: string[]): Seg[] {
  if (!terms.length) return [{ text, hit: false }];
  const stems = terms.map(stem);
  const out: Seg[] = [];
  for (const part of text.split(/([\p{L}\p{N}]+)/u)) {
    if (!part) continue;
    const w = fold(part);
    const hit = /[\p{L}\p{N}]/u.test(part) && stems.some((s) => w.startsWith(s) && w.length <= s.length + 4);
    const last = out[out.length - 1];
    if (last && last.hit === hit) last.text += part;
    else out.push({ text: part, hit });
  }
  return out;
}
