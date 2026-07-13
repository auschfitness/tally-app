// Reconhecimento de escritura (Step 5 · Fase 3a): varre um texto e detecta
// referências bíblicas em PT/EN/abreviações ("João 10:1-18", "Rm 8:28", "1Co 13",
// "Salmo 23", "John 3:16") → objetos {book(code USFM), chapter, verse_start,
// verse_end, reference}. É determinístico (regex), não IA. O `reference` é
// canonicalizado para o nome PT de exibição, para consistência no app e no mapa.

import { NAME_TO_CODE, normToken, bookName } from "./bible-books.js";

// nº opcional (1/2/3 ou I/II/III) + palavra do livro + capítulo + (:versículo(-versículo))?
// Lookbehind zero-width (não consome o delimitador) para não "comer" o "1" de "1Co"
// quando uma palavra vizinha não-livro (ex.: "ver 1Co 13") é testada antes.
var RE = /(?<![\wÀ-ÿ])((?:[123]|I{1,3})\s*)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]+)\.?\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?/g;

// Converte "III" → "3" (número romano simples), senão devolve o dígito.
function romanish(p) {
  if (!p) return "";
  var t = p.trim().toLowerCase();
  if (t === "i") return "1"; if (t === "ii") return "2"; if (t === "iii") return "3";
  return t;
}

export function refKey(r) { return r.book + "-" + r.chapter + "-" + (r.verse_start || "") + "-" + (r.verse_end || ""); }

// Monta a string humana canônica ("Romanos 8:28", "João 10:1-18", "Salmos 23").
export function buildReference(code, chapter, vs, ve) {
  var s = bookName(code) + " " + chapter;
  if (vs) { s += ":" + vs; if (ve && ve !== vs) s += "-" + ve; }
  return s;
}

// Detecta todas as referências únicas num texto. Nunca lança.
export function parseRefs(text) {
  if (!text) return [];
  var out = [], seen = {}, m;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null) {
    var prefix = romanish(m[1]);
    var word = normToken(m[2]);
    var code = NAME_TO_CODE[prefix + word] || (!prefix ? NAME_TO_CODE[word] : null);
    if (!code) {
      // Palavra não é livro: rebobina para logo após a palavra, para que os dígitos
      // seguintes possam servir como prefixo de uma referência real (ex.: "1Co").
      RE.lastIndex = m.index + (m[1] ? m[1].length : 0) + m[2].length;
      continue;
    }
    var chapter = parseInt(m[3], 10); if (!chapter) continue;
    var vs = m[4] ? parseInt(m[4], 10) : null;
    var ve = m[5] ? parseInt(m[5], 10) : null;
    if (ve && vs && ve < vs) ve = null;
    var r = { book: code, chapter: chapter, verse_start: vs, verse_end: ve, reference: buildReference(code, chapter, vs, ve) };
    var k = refKey(r);
    if (seen[k]) continue; seen[k] = 1; out.push(r);
  }
  return out;
}
