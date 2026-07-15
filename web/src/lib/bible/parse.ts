// Reconhecimento de escritura (Study · passagens): varre um texto e detecta
// referências bíblicas em PT/EN/abreviações ("João 10:1-18", "Rm 8:28", "1Co 13",
// "Salmo 23", "John 3:16") → {book(code USFM), chapter, verse_start, verse_end,
// reference}. Determinístico (regex), não IA. `reference` canonicalizado para o nome
// PT de exibição. Portado 1:1 de scripture-parse.js.
import { NAME_TO_CODE, bookName, normToken } from "./books";

export interface ScriptureRef {
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  reference: string;
}

// nº opcional (1/2/3 ou I/II/III) + palavra do livro + capítulo + (:versículo(-versículo))?
const RE = /(?<![\wÀ-ÿ])((?:[123]|I{1,3})\s*)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]+)\.?\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?/g;

// "III" → "3" (romano simples), senão o dígito.
function romanish(p: string | undefined): string {
  if (!p) return "";
  const t = p.trim().toLowerCase();
  if (t === "i") return "1";
  if (t === "ii") return "2";
  if (t === "iii") return "3";
  return t;
}

export function refKey(r: ScriptureRef): string {
  return r.book + "-" + r.chapter + "-" + (r.verse_start || "") + "-" + (r.verse_end || "");
}

// Monta a string humana canônica ("Romanos 8:28", "João 10:1-18", "Salmos 23").
export function buildReference(code: string, chapter: number, vs: number | null, ve: number | null): string {
  let s = bookName(code) + " " + chapter;
  if (vs) {
    s += ":" + vs;
    if (ve && ve !== vs) s += "-" + ve;
  }
  return s;
}

// Detecta todas as referências únicas num texto. Nunca lança.
export function parseRefs(text: string): ScriptureRef[] {
  if (!text) return [];
  const out: ScriptureRef[] = [];
  const seen: Record<string, 1> = {};
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null) {
    const prefix = romanish(m[1]);
    const word = normToken(m[2]!);
    const code = NAME_TO_CODE[prefix + word] || (!prefix ? NAME_TO_CODE[word] : null);
    if (!code) {
      // Palavra não é livro: rebobina para logo após a palavra (para "1Co" etc.).
      RE.lastIndex = m.index + (m[1] ? m[1].length : 0) + m[2]!.length;
      continue;
    }
    const chapter = parseInt(m[3]!, 10);
    if (!chapter) continue;
    const vs = m[4] ? parseInt(m[4], 10) : null;
    let ve = m[5] ? parseInt(m[5], 10) : null;
    if (ve && vs && ve < vs) ve = null;
    const r: ScriptureRef = { book: code, chapter, verse_start: vs, verse_end: ve, reference: buildReference(code, chapter, vs, ve) };
    const k = refKey(r);
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(r);
  }
  return out;
}
