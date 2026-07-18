// Mapa entre os códigos de livro do openbible/TSK e os códigos USFM que o app usa.
// O dataset `cross_references` guarda códigos OSIS (Gen, John, 1Cor, Ps, Song…); a
// UI/helloao (ver `BOOKS`) usa USFM 3 letras (GEN, JHN, 1CO, PSA, SNG…). Pareado 1:1
// pela ordem canônica 1..66 (mesma ordem de BOOKS) — fonte única, sem duplicar nomes.
import { BOOKS } from "./books";

// OSIS na ordem canônica 1..66, alinhado a BOOKS (por `order`).
const OSIS_ORDERED = [
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam",
  "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov",
  "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos",
  "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt",
  "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil",
  "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet",
  "2Pet", "1John", "2John", "3John", "Jude", "Rev",
];

const USFM_TO_OSIS: Record<string, string> = {};
const OSIS_TO_USFM: Record<string, string> = {};
[...BOOKS]
  .sort((a, b) => a.order - b.order)
  .forEach((b, i) => {
    const osis = OSIS_ORDERED[i];
    if (!osis) return;
    USFM_TO_OSIS[b.code] = osis;
    OSIS_TO_USFM[osis.toLowerCase()] = b.code;
  });

// USFM do app (JHN) → OSIS do dataset (John). null se desconhecido.
export function usfmToOsis(code: string): string | null {
  return USFM_TO_OSIS[code] ?? null;
}
// OSIS do dataset (John / Ps / 1Cor) → USFM do app (JHN). Tolerante a caixa. null se
// não for um dos 66 (ex.: apócrifos que o app não abre).
export function osisToUsfm(osis: string): string | null {
  return OSIS_TO_USFM[(osis || "").toLowerCase()] ?? null;
}
