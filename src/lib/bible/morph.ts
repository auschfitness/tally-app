// Decodifica códigos de morfologia (STEPBible / Robinson) para PT-BR legível, no
// popover da aba Original. Cobre os casos COMUNS do grego (ex.: "V-AAI-3S" → "Verbo ·
// Aoristo · Ativa · Indicativo · 3ª pessoa singular"; "N-NSM" → "Substantivo ·
// Nominativo · singular · masculino") e um básico de hebraico. Sempre cai no código
// CRU quando não reconhece — nunca esconde o dado. Expandir conforme necessário.

const GK_POS: Record<string, string> = {
  V: "Verbo",
  N: "Substantivo",
  A: "Adjetivo",
  T: "Artigo",
  RA: "Artigo",
  RD: "Pronome demonstrativo",
  RP: "Pronome pessoal",
  RR: "Pronome relativo",
  RI: "Pronome interrogativo/indefinido",
  RX: "Pronome",
  RT: "Pronome",
  C: "Conjunção",
  CONJ: "Conjunção",
  P: "Preposição",
  PREP: "Preposição",
  D: "Advérbio",
  ADV: "Advérbio",
  PRT: "Partícula",
  I: "Interjeição",
  X: "Indeclinável",
};
const GK_TENSE: Record<string, string> = {
  P: "Presente",
  I: "Imperfeito",
  F: "Futuro",
  A: "Aoristo",
  X: "Perfeito",
  R: "Perfeito",
  L: "Mais-que-perfeito",
  Y: "Mais-que-perfeito",
};
const GK_VOICE: Record<string, string> = {
  A: "Ativa",
  M: "Média",
  P: "Passiva",
  E: "Média/Passiva",
  D: "Depoente",
  O: "Média/Passiva depoente",
  N: "Média/Passiva",
};
const GK_MOOD: Record<string, string> = {
  I: "Indicativo",
  S: "Subjuntivo",
  O: "Optativo",
  M: "Imperativo",
  N: "Infinitivo",
  P: "Particípio",
};
const GK_CASE: Record<string, string> = {
  N: "Nominativo",
  G: "Genitivo",
  D: "Dativo",
  A: "Acusativo",
  V: "Vocativo",
};
const NUM: Record<string, string> = { S: "singular", P: "plural", D: "dual" };
const GEN: Record<string, string> = { M: "masculino", F: "feminino", N: "neutro" };
const PERS: Record<string, string> = { "1": "1ª pessoa", "2": "2ª pessoa", "3": "3ª pessoa" };

// case+number+gender de um bloco tipo "NSM" (nominal/particípio).
function caseNumGen(block: string): string[] {
  const out: string[] = [];
  if (GK_CASE[block[0]!]) out.push(GK_CASE[block[0]!]!);
  if (block[1] && NUM[block[1]]) out.push(NUM[block[1]]!);
  if (block[2] && GEN[block[2]]) out.push(GEN[block[2]]!);
  return out;
}

function decodeGreek(code: string): string[] {
  const segs = code.split("-");
  const posKey = segs[0]!.toUpperCase();
  const parts: string[] = [GK_POS[posKey] ?? posKey];

  if (posKey === "V" && segs[1]) {
    // STEPBible marca 1ª/2ª forma com um dígito inicial no bloco tempo-voz-modo
    // (ex.: "2AAI" = 2º aoristo). O dígito não muda a análise — descarta.
    const tvm = segs[1].toUpperCase().replace(/^\d/, "");
    if (GK_TENSE[tvm[0]!]) parts.push(GK_TENSE[tvm[0]!]!);
    if (tvm[1] && GK_VOICE[tvm[1]]) parts.push(GK_VOICE[tvm[1]]!);
    if (tvm[2] && GK_MOOD[tvm[2]]) parts.push(GK_MOOD[tvm[2]]!);
    const tail = (segs[2] || "").toUpperCase();
    if (tvm[2] === "P" || tvm[2] === "N") {
      // particípio/infinitivo: bloco caso-número-gênero (quando houver)
      parts.push(...caseNumGen(tail));
    } else if (tail) {
      if (PERS[tail[0]!]) parts.push(PERS[tail[0]!]!);
      if (tail[1] && NUM[tail[1]]) parts.push(NUM[tail[1]]!);
    }
  } else if (segs[1]) {
    // nominal: caso-número-gênero (ex.: "NSM")
    parts.push(...caseNumGen(segs[1].toUpperCase()));
  }
  return parts;
}

const HB_POS: Record<string, string> = {
  V: "Verbo",
  N: "Substantivo",
  A: "Adjetivo",
  P: "Pronome",
  R: "Preposição",
  T: "Partícula",
  C: "Conjunção",
  D: "Advérbio",
  S: "Sufixo",
};
const HB_STEM: Record<string, string> = {
  q: "Qal",
  N: "Nifal",
  p: "Piel",
  P: "Pual",
  h: "Hifil",
  H: "Hofal",
  t: "Hitpael",
};
const HB_ASPECT: Record<string, string> = {
  p: "Perfeito",
  q: "Imperfeito",
  w: "Consecutivo",
  v: "Imperativo",
  i: "Imperativo",
  a: "Infinitivo absoluto",
  c: "Infinitivo construto",
  r: "Particípio",
  s: "Particípio passivo",
};

// Hebraico STEPBible costuma vir como "H" + POS + traços (ex.: "HVqp3ms"). Decodifica o
// que der; o resto fica no código cru.
function decodeHebrew(code: string): string[] {
  let c = code;
  if (c[0] === "H") c = c.slice(1);
  const parts: string[] = [];
  const pos = c[0];
  if (pos && HB_POS[pos]) parts.push(HB_POS[pos]!);
  if (pos === "V") {
    if (c[1] && HB_STEM[c[1]]) parts.push(HB_STEM[c[1]]!);
    if (c[2] && HB_ASPECT[c[2]]) parts.push(HB_ASPECT[c[2]]!);
    const rest = c.slice(3);
    if (PERS[rest[0]!]) parts.push(PERS[rest[0]!]!);
    for (const ch of rest) {
      if (ch === "m") parts.push("masculino");
      else if (ch === "f") parts.push("feminino");
      else if (ch === "s") parts.push("singular");
      else if (ch === "p") parts.push("plural");
    }
  } else if (pos === "N" || pos === "A") {
    for (const ch of c.slice(1)) {
      if (ch === "m") parts.push("masculino");
      else if (ch === "f") parts.push("feminino");
      else if (ch === "s") parts.push("singular");
      else if (ch === "p") parts.push("plural");
    }
  }
  return parts;
}

// Decodifica um código morfológico para uma frase legível em PT-BR. `lang` = 'grc'|'hbo'.
// Nunca lança; devolve o código cru se não reconhecer nada.
export function decodeMorph(code: string | null | undefined, lang: string): string {
  const raw = (code || "").trim();
  if (!raw) return "";
  try {
    const parts = lang === "hbo" ? decodeHebrew(raw) : decodeGreek(raw);
    // Só considera decodificado se foi além do próprio código (mais de 1 parte, ou 1
    // parte que não seja o código literal).
    if (parts.length && !(parts.length === 1 && parts[0] === raw)) {
      return parts.join(" · ");
    }
  } catch {
    /* cai no cru */
  }
  return raw;
}
