// BBB da UBS (040 = Mateus) → OSIS do banco e abreviação brasileira.
const BOOKS = [
  ["Matt", "Mt"], ["Mark", "Mc"], ["Luke", "Lc"], ["John", "Jo"], ["Acts", "At"], ["Rom", "Rm"],
  ["1Cor", "1Co"], ["2Cor", "2Co"], ["Gal", "Gl"], ["Eph", "Ef"], ["Phil", "Fp"], ["Col", "Cl"],
  ["1Thess", "1Ts"], ["2Thess", "2Ts"], ["1Tim", "1Tm"], ["2Tim", "2Tm"], ["Titus", "Tt"], ["Phlm", "Fm"],
  ["Heb", "Hb"], ["Jas", "Tg"], ["1Pet", "1Pe"], ["2Pet", "2Pe"], ["1John", "1Jo"], ["2John", "2Jo"],
  ["3John", "3Jo"], ["Jude", "Jd"], ["Rev", "Ap"],
];
const OT_OSIS = "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal".split(" ");
export const book = (bbb) => Number(bbb) < 40 ? (OT_OSIS[Number(bbb) - 1] ? [OT_OSIS[Number(bbb) - 1], OT[Number(bbb) - 1]] : undefined) : BOOKS[Number(bbb) - 40];
// Os comentários também citam o AT (001 = Gênesis): só a abreviação, para o texto.
const OT = "Gn Êx Lv Nm Dt Js Jz Rt 1Sm 2Sm 1Rs 2Rs 1Cr 2Cr Ed Ne Et Jó Sl Pv Ec Ct Is Jr Lm Ez Dn Os Jl Am Ob Jn Mq Na Hc Sf Ag Zc Ml".split(" ");
const abbr = (bbb) => (Number(bbb) < 40 ? OT[Number(bbb) - 1] : book(bbb)?.[1]);
export const osisRef = (r) => /^\d{9,}$/.test(r) && book(r.slice(0, 3)) && Number(r.slice(3, 6)) > 0 && Number(r.slice(6, 9)) > 0 ? `${book(r.slice(0, 3))[0]}.${Number(r.slice(3, 6))}.${Number(r.slice(6, 9))}` : null;

// Marcações da UBS → texto de leitura: {S:ref} vira "Mt 3.7", {L:lema<…>} vira o lema,
// {D:25.33} vira "25.33", notas {N:001} e letras de homógrafo [a] somem, " | " e <br> viram parágrafo.
export function cleanUbs(s) {
  return String(s ?? "")
    .replace(/(\p{L})\{S:/gu, "$1 {S:") // a UBS às vezes cola a referência na palavra ("En{S:…}")
    .replace(/\{S:(\d{3})(\d{3})(\d{3})\d*\}/g, (_, b, c, v) => (abbr(b) ? `${abbr(b)} ${Number(c)}${Number(v) ? `.${Number(v)}` : ""}` : ""))
    .replace(/\{L:([^<}]+)(<[^}]*)?\}/g, "$1")
    .replace(/\{D:([\d.]+)\}/g, "$1")
    .replace(/\{N:\d+\}/g, "")
    .replace(/(\p{Script=Greek})\[[a-z]\]/gu, "$1")
    .replace(/\s*(\||<br\s*\/?>)\s*/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ([,.;:)])/g, "$1")
    .trim();
}

