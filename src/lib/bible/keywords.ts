// Palavras-chave de uma passagem (aba Palavras-chave do hub "Estudo do Texto"). Lógica
// PURA: a partir dos tokens do original (bible_original_tokens), descarta palavras
// funcionais (artigo/partícula/conjunção/preposição), agrupa por número de Strong (uma
// palavra-chave por Strong distinto no trecho) e ordena por RELEVÂNCIA: as mais RARAS no
// cânone primeiro (menor `occurrences`) — o que é raro e aparece aqui costuma carregar peso.
// O acesso ao banco (tokens/léxico/frequência) fica no componente; aqui só filtra/agrupa/ordena.
import { isFunctionWord } from "./morph";

export interface KeywordToken {
  strong: string | null;
  lemma: string | null;
  morph: string | null;
  gloss: string | null;
}
export interface LexLite {
  lemma: string | null;
  gloss: string | null;
  definition: string | null;
}
export interface Keyword {
  strong: string;
  lemma: string;
  meaning: string;
  occurrences: number | null; // frequência global no cânone (null = desconhecida)
  count: number; // quantas vezes aparece neste trecho
}

// Monta as palavras-chave ranqueadas. `lex` e `freq` são mapas por Strong (opcionais —
// degrada com elegância se faltarem).
export function buildKeywords(
  tokens: KeywordToken[],
  lang: string,
  lex: Record<string, LexLite>,
  freq: Record<string, number>,
): Keyword[] {
  const by = new Map<string, Keyword>();
  for (const t of tokens) {
    if (!t.strong) continue; // sem Strong não vira palavra-chave
    if (isFunctionWord(t.morph, lang)) continue; // descarta palavra funcional
    const existing = by.get(t.strong);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const lx = lex[t.strong];
    const lemma = t.lemma || lx?.lemma || t.strong;
    const meaning = lx?.gloss || t.gloss || lx?.definition || "";
    const occurrences = t.strong in freq ? freq[t.strong]! : null;
    by.set(t.strong, { strong: t.strong, lemma, meaning, occurrences, count: 1 });
  }
  // Raras primeiro. Frequência desconhecida (null) vai para o fim. Empate: mais vezes no
  // trecho primeiro, depois por Strong (estável).
  return [...by.values()].sort((a, b) => {
    const fa = a.occurrences ?? Infinity;
    const fb = b.occurrences ?? Infinity;
    if (fa !== fb) return fa - fb;
    if (a.count !== b.count) return b.count - a.count;
    return a.strong.localeCompare(b.strong);
  });
}
