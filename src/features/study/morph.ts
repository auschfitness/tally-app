// Código morfológico do STEPBible → português legível. Grego no padrão Robinson
// ('V-AAI-3S', 'N-GSM-P'); hebraico/aramaico no padrão OSHB ('HVqp3ms', 'HR/Ncfsa').
// Puro: testado em morph.test.ts. Código desconhecido devolve "" (a tela só esconde a linha).

const CASE: Record<string, string> = { N: "nominativo", G: "genitivo", D: "dativo", A: "acusativo", V: "vocativo" };
const NUM: Record<string, string> = { S: "singular", P: "plural" };
const GEN: Record<string, string> = { M: "masculino", F: "feminino", N: "neutro" };
const TENSE: Record<string, string> = { P: "presente", I: "imperfeito", F: "futuro", A: "aoristo", R: "perfeito", L: "mais-que-perfeito" };
const VOICE: Record<string, string> = { A: "ativo", M: "médio", P: "passivo", E: "médio ou passivo", D: "médio depoente", O: "passivo depoente", N: "médio/passivo depoente" };
const MOOD: Record<string, string> = { I: "indicativo", S: "subjuntivo", O: "optativo", M: "imperativo", N: "infinitivo", P: "particípio" };
const WORD: Record<string, string> = {
  CONJ: "conjunção", PREP: "preposição", ADV: "advérbio", PRT: "partícula", INJ: "interjeição", COND: "conjunção condicional",
  HEB: "palavra hebraica", ARAM: "palavra aramaica",
};
const PRON: Record<string, string> = {
  T: "artigo", A: "adjetivo", N: "substantivo", P: "pronome pessoal", R: "pronome relativo", C: "pronome recíproco",
  D: "pronome demonstrativo", K: "pronome correlativo", I: "pronome interrogativo", X: "pronome indefinido",
  Q: "pronome correlativo", F: "pronome reflexivo", S: "pronome possessivo",
};

const ordinal = (p: string): string => (p ? `${p}ª pessoa` : "");
const join = (parts: (string | undefined)[], sep = " "): string => parts.filter(Boolean).join(sep);

function cng(s: string): string {
  return join([CASE[s[0] ?? ""], NUM[s[1] ?? ""], GEN[s[2] ?? ""]]);
}

function greek(code: string): string {
  const [head = "", ...rest] = code.split("-");
  const word = WORD[head];
  if (word) return word;
  if (head === "V") {
    const tvm = (rest[0] ?? "").replace(/^2/, "");
    const [t = "", v = "", m = ""] = tvm;
    const verb = join([TENSE[t], VOICE[v], MOOD[m]]);
    const tail = rest[1] ?? "";
    // Particípio carrega caso/número/gênero; os demais, pessoa e número.
    const who = m === "P" ? cng(tail) : /^\d/.test(tail) ? join([ordinal(tail[0] ?? ""), "do", NUM[tail[1] ?? ""]]) : "";
    return join(["verbo", verb, who], " · ");
  }
  const kind = PRON[head];
  if (!kind) return "";
  const body = rest[0] ?? "";
  // Pronome pessoal: P-1NS (pessoa + caso + número). Indeclinável: N-PRI, A-NUI.
  if (/^\d/.test(body)) return join([kind, join([ordinal(body[0] ?? ""), CASE[body[1] ?? ""], NUM[body[2] ?? ""]])], " · ");
  if (body === "PRI") return "nome próprio indeclinável";
  if (body === "NUI") return "numeral indeclinável";
  const label = rest.includes("P") ? "nome próprio" : rest.includes("T") ? `${kind} (título)` : kind;
  return join([label, cng(body)], " · ");
}

const H_POS: Record<string, string> = {
  A: "adjetivo", C: "conjunção", D: "advérbio", N: "substantivo", P: "pronome", R: "preposição", S: "sufixo", T: "partícula", V: "verbo",
};
const H_STEM: Record<string, string> = {
  q: "qal", N: "nifal", p: "piel", P: "pual", h: "hifil", H: "hofal", t: "hitpael", o: "polel", O: "polal", r: "hitpolel",
  m: "poel", M: "poal", k: "palel", K: "pulal", Q: "qal passivo", l: "pilpel", L: "polpal", f: "hitpalpel",
  D: "nitpael", j: "pealal", i: "pilel", u: "hotpaal", c: "tifil", v: "hishtafel", w: "nitpolel", y: "hitpoel", z: "hitpalel",
};
const H_CONJ: Record<string, string> = {
  p: "perfeito", q: "perfeito consecutivo", i: "imperfeito", w: "imperfeito consecutivo", h: "coortativo", j: "jussivo",
  v: "imperativo", r: "particípio ativo", s: "particípio passivo", a: "infinitivo absoluto", c: "infinitivo construto",
};
const H_GEN: Record<string, string> = { m: "masculino", f: "feminino", b: "comum", c: "comum" };
const H_NUM: Record<string, string> = { s: "singular", p: "plural", d: "dual" };
const H_STATE: Record<string, string> = { a: "absoluto", c: "construto", d: "determinado" };
const H_PREFIX: Record<string, string> = { R: "com preposição", C: "com conjunção", Td: "com artigo", Ti: "com partícula interrogativa" };

function hebrewSeg(s: string): string {
  const pos = H_POS[s[0] ?? ""];
  if (!pos) return "";
  if (s[0] === "V") {
    const [, stem = "", conj = "", ...pgn] = s;
    const rest = pgn.join("");
    const who = /^\d/.test(rest)
      ? join([ordinal(rest[0] ?? ""), H_GEN[rest[1] ?? ""], H_NUM[rest[2] ?? ""]])
      : join([H_GEN[rest[0] ?? ""], H_NUM[rest[1] ?? ""]]);
    return join(["verbo", join([H_STEM[stem], H_CONJ[conj]]), who], " · ");
  }
  if (s[0] === "N") {
    const [, type = "", g = "", n = "", st = ""] = s;
    const label = type === "p" ? "nome próprio" : type === "g" ? "gentílico" : "substantivo";
    return join([label, join([H_GEN[g], H_NUM[n], H_STATE[st]])], " · ");
  }
  if (s[0] === "A") {
    const [, , g = "", n = "", st = ""] = s;
    return join(["adjetivo", join([H_GEN[g], H_NUM[n], H_STATE[st]])], " · ");
  }
  if (s === "To") return "marcador de objeto direto";
  if (s === "Td") return "artigo";
  if (s === "Tn") return "partícula de negação";
  return pos;
}

function hebrew(code: string): string {
  const segs = code.slice(1).split("/");
  // A palavra principal é a última que não é sufixo; o que vem antes são prefixos.
  let main = segs.length - 1;
  while (main > 0 && segs[main]?.startsWith("S")) main--;
  const head = hebrewSeg(segs[main] ?? "");
  const pre = segs.slice(0, main).map((s) => H_PREFIX[s] ?? H_PREFIX[s[0] ?? ""]).filter(Boolean);
  const suf = segs.slice(main + 1).some((s) => s.startsWith("S")) ? "com sufixo" : "";
  return join([head, ...pre, suf, code[0] === "A" ? "aramaico" : ""], " · ");
}

export function morphPt(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "";
  // 'ADV'/'ARAM' são grego sem hífen: o dicionário de palavras decide antes do OSHB.
  if (WORD[c]) return WORD[c];
  return /^[HA][ACDNPRSTV]/.test(c) && !c.includes("-") ? hebrew(c) : greek(c);
}
