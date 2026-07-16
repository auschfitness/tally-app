// Lista canônica dos 66 livros (Study · passagens). `code` é USFM 3 letras (GEN,
// JHN, 1CO) — o MESMO id que a Free Use Bible API (helloao) usa e o gravado em
// sermon_scriptures.book. `order` dá a sequência 1-66 do Mapa de Escrituras; `pt`/`en`
// nomes de exibição; `abbr` as formas que o parser aceita. Portado 1:1 de bible-books.js.

// [code, order, pt, en, [abreviações extras (PT/EN, sem acento/ponto)]]
const RAW: [string, number, string, string, string[]][] = [
  ["GEN", 1, "Gênesis", "Genesis", ["gn", "gen"]],
  ["EXO", 2, "Êxodo", "Exodus", ["ex", "exo", "exod"]],
  ["LEV", 3, "Levítico", "Leviticus", ["lv", "lev"]],
  ["NUM", 4, "Números", "Numbers", ["nm", "num", "nb"]],
  ["DEU", 5, "Deuteronômio", "Deuteronomy", ["dt", "deu", "deut"]],
  ["JOS", 6, "Josué", "Joshua", ["js", "jos", "josh"]],
  ["JDG", 7, "Juízes", "Judges", ["jz", "jdg", "judg", "jui", "juizes"]],
  ["RUT", 8, "Rute", "Ruth", ["rt", "rut", "rute"]],
  ["1SA", 9, "1 Samuel", "1 Samuel", ["1sm", "1sa", "1sam", "1samuel"]],
  ["2SA", 10, "2 Samuel", "2 Samuel", ["2sm", "2sa", "2sam", "2samuel"]],
  ["1KI", 11, "1 Reis", "1 Kings", ["1rs", "1re", "1ki", "1reis", "1kings"]],
  ["2KI", 12, "2 Reis", "2 Kings", ["2rs", "2re", "2ki", "2reis", "2kings"]],
  ["1CH", 13, "1 Crônicas", "1 Chronicles", ["1cr", "1ch", "1cron", "1cronicas", "1chr"]],
  ["2CH", 14, "2 Crônicas", "2 Chronicles", ["2cr", "2ch", "2cron", "2cronicas", "2chr"]],
  ["EZR", 15, "Esdras", "Ezra", ["ed", "esd", "ezr", "esdras"]],
  ["NEH", 16, "Neemias", "Nehemiah", ["ne", "neh", "neem", "neemias"]],
  ["EST", 17, "Ester", "Esther", ["et", "est", "ester", "esth"]],
  ["JOB", 18, "Jó", "Job", ["jo", "job"]],
  ["PSA", 19, "Salmos", "Psalms", ["sl", "salmo", "salmos", "ps", "psa", "psalm"]],
  ["PRO", 20, "Provérbios", "Proverbs", ["pv", "prov", "pro", "proverbios", "prv"]],
  ["ECC", 21, "Eclesiastes", "Ecclesiastes", ["ec", "ecl", "ecc", "eclesiastes", "eccl"]],
  ["SNG", 22, "Cânticos", "Song of Songs", ["ct", "cant", "canticos", "cantares", "sng", "song", "sos"]],
  ["ISA", 23, "Isaías", "Isaiah", ["is", "isa", "isaias"]],
  ["JER", 24, "Jeremias", "Jeremiah", ["jr", "jer", "jeremias"]],
  ["LAM", 25, "Lamentações", "Lamentations", ["lm", "lam", "lamentacoes"]],
  ["EZK", 26, "Ezequiel", "Ezekiel", ["ez", "ezq", "ezk", "eze", "ezequiel", "ezek"]],
  ["DAN", 27, "Daniel", "Daniel", ["dn", "dan", "daniel"]],
  ["HOS", 28, "Oseias", "Hosea", ["os", "ose", "hos", "oseias"]],
  ["JOL", 29, "Joel", "Joel", ["jl", "joel", "jol"]],
  ["AMO", 30, "Amós", "Amos", ["am", "amo", "amos"]],
  ["OBA", 31, "Obadias", "Obadiah", ["ob", "obd", "oba", "obadias"]],
  ["JON", 32, "Jonas", "Jonah", ["jn", "jon", "jonas"]],
  ["MIC", 33, "Miqueias", "Micah", ["mq", "miq", "mic", "miqueias"]],
  ["NAM", 34, "Naum", "Nahum", ["na", "nau", "nam", "naum"]],
  ["HAB", 35, "Habacuque", "Habakkuk", ["hc", "hab", "habacuque"]],
  ["ZEP", 36, "Sofonias", "Zephaniah", ["sf", "sof", "zep", "sofonias"]],
  ["HAG", 37, "Ageu", "Haggai", ["ag", "age", "hag", "ageu"]],
  ["ZEC", 38, "Zacarias", "Zechariah", ["zc", "zac", "zec", "zacarias"]],
  ["MAL", 39, "Malaquias", "Malachi", ["ml", "mal", "malaquias"]],
  ["MAT", 40, "Mateus", "Matthew", ["mt", "mat", "mateus", "matt"]],
  ["MRK", 41, "Marcos", "Mark", ["mc", "mar", "mrk", "marcos", "mk"]],
  ["LUK", 42, "Lucas", "Luke", ["lc", "luc", "luk", "lucas", "lk"]],
  ["JHN", 43, "João", "John", ["jo", "joa", "jhn", "joao", "jn"]],
  ["ACT", 44, "Atos", "Acts", ["at", "ato", "act", "atos"]],
  ["ROM", 45, "Romanos", "Romans", ["rm", "rom", "romanos"]],
  ["1CO", 46, "1 Coríntios", "1 Corinthians", ["1co", "1cor", "1corintios", "1corinthians"]],
  ["2CO", 47, "2 Coríntios", "2 Corinthians", ["2co", "2cor", "2corintios", "2corinthians"]],
  ["GAL", 48, "Gálatas", "Galatians", ["gl", "gal", "galatas"]],
  ["EPH", 49, "Efésios", "Ephesians", ["ef", "efe", "eph", "efesios"]],
  ["PHP", 50, "Filipenses", "Philippians", ["fp", "fil", "php", "filipenses", "phil"]],
  ["COL", 51, "Colossenses", "Colossians", ["cl", "col", "colossenses"]],
  ["1TH", 52, "1 Tessalonicenses", "1 Thessalonians", ["1ts", "1te", "1th", "1tess", "1tessalonicenses"]],
  ["2TH", 53, "2 Tessalonicenses", "2 Thessalonians", ["2ts", "2te", "2th", "2tess", "2tessalonicenses"]],
  ["1TI", 54, "1 Timóteo", "1 Timothy", ["1tm", "1ti", "1tim", "1timoteo", "1timothy"]],
  ["2TI", 55, "2 Timóteo", "2 Timothy", ["2tm", "2ti", "2tim", "2timoteo", "2timothy"]],
  ["TIT", 56, "Tito", "Titus", ["tt", "tit", "tito", "titus"]],
  ["PHM", 57, "Filemom", "Philemon", ["fm", "flm", "phm", "filemom", "philem"]],
  ["HEB", 58, "Hebreus", "Hebrews", ["hb", "heb", "hebreus"]],
  ["JAS", 59, "Tiago", "James", ["tg", "tia", "jas", "tiago", "jam"]],
  ["1PE", 60, "1 Pedro", "1 Peter", ["1pe", "1pd", "1pet", "1pedro", "1peter"]],
  ["2PE", 61, "2 Pedro", "2 Peter", ["2pe", "2pd", "2pet", "2pedro", "2peter"]],
  ["1JN", 62, "1 João", "1 John", ["1jo", "1jn", "1joao", "1john"]],
  ["2JN", 63, "2 João", "2 John", ["2jo", "2jn", "2joao", "2john"]],
  ["3JN", 64, "3 João", "3 John", ["3jo", "3jn", "3joao", "3john"]],
  ["JUD", 65, "Judas", "Jude", ["jd", "jud", "judas"]],
  ["REV", 66, "Apocalipse", "Revelation", ["ap", "apo", "rev", "apocalipse", "apoc"]],
];

export interface BibleBook {
  code: string;
  order: number;
  pt: string;
  en: string;
  abbr: string[];
}

// Normaliza um token: minúsculas, sem acento, sem pontos/espaços.
export function normToken(s: string): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\s]/g, "");
}

export const BOOKS: BibleBook[] = RAW.map((r) => ({ code: r[0], order: r[1], pt: r[2], en: r[3], abbr: r[4] }));

// Mapa nome/abreviação normalizado → código canônico (para o parser).
export const NAME_TO_CODE: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const b of BOOKS) {
    for (const form of [b.pt, b.en, ...b.abbr]) m[normToken(form)] = b.code;
  }
  return m;
})();

const CODE_TO_BOOK: Record<string, BibleBook> = (() => {
  const m: Record<string, BibleBook> = {};
  for (const b of BOOKS) m[b.code] = b;
  return m;
})();

export function bookByCode(code: string): BibleBook | null {
  return CODE_TO_BOOK[code] ?? null;
}
// Nome de exibição do livro (PT por padrão — o app é PT).
export function bookName(code: string): string {
  return CODE_TO_BOOK[code]?.pt ?? code;
}
