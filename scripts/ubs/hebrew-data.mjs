// UBS SDBH oficial em português. Só adapta formato; não traduz definições.
import assert from "node:assert/strict";
import { cleanUbs, osisRef } from "./ubs-text.mjs";

// Estes 29 rótulos ainda não têm localização PT no arquivo oficial de domínios.
export const DOMAIN_PT = {
  "001002007": "Vegetação", "001002007001": "Plantas", "001001001": "Divindades",
  "003001017001": "Títulos de divindades", "001002008": "Corpos de água", "001002002": "Terra",
  "001002007002": "Árvores", "002001001022": "Expressões faciais", "001003001001016": "Sinais",
  "002003001021": "Não inteiro", "002003003008": "Adiar", "001003002007": "Estradas",
  "002002001013": "Não se mover", "002003001020": "Inteiro", "002003002015": "Casar",
  "001002003": "Relevos", "002001001023": "Identificar", "002003001006": "Separar",
  "002002001004": "Não conter", "001002004": "Paisagens", "002001001068": "Usar",
  "002002001015": "Permanecer", "002002001009": "Não fluir", "002002001006": "Encontrar",
  "001002005012": "Fumaça", "003002001": "Referentes causais", "002001001044": "Abundância",
  "002001001030": "Frequente", "002003003004": "Não suportar",
};

export function cleanHebrew(text) {
  return cleanUbs(text)
    .replace(/\{A:([^}]+)\}/g, "$1")
    .replace(/([\p{Script=Hebrew}\p{M}])\[[a-z]\]/gu, "$1")
    .replace(/^[=►≈]\s*/u, "")
    .replace(/[►≈]/gu, "; ")
    .replace(/—/g, ",")
    .replace(/[ \t]+/g, " ").trim();
}

export function hebrewRows(dict, domainFile, mapVerse = (ref) => ref) {
  const domains = new Map(domainFile.flatMap((d) => {
    const pt = d.SemanticDomainLocalizations?.find((s) => s.LanguageCode === "pt")?.Label;
    return pt ? [[d.Code, pt]] : [];
  }));
  for (const [code, pt] of Object.entries(DOMAIN_PT)) domains.set(code, pt);
  const rows = new Map();
  const report = { entries: dict.length, meanings: 0, noPortuguese: 0, empty: 0, noStrong: 0, invalidRefs: 0, remappedRefs: 0, unmarkedRefs: 0 };
  const labels = (items) => [...new Set((items ?? []).filter((d) => d.DomainCode).map((d) => {
    assert(domains.has(d.DomainCode), `Domínio sem português: ${d.DomainCode}`);
    return domains.get(d.DomainCode);
  }))];
  for (const e of dict) {
    // A é a convenção UBS para Strong aramaico; o STEPBible usa H nesses mesmos números.
    const strongs = [...new Set((e.StrongCodes ?? []).filter((s) => /^[HA]\d{1,4}$/.test(s)).map((s) => `H${s.slice(1).padStart(4, "0")}`))];
    let ord = 0;
    for (const b of e.BaseForms ?? []) for (const m of b.LEXMeanings ?? []) {
      const order = ord++;
      report.meanings++;
      if (!strongs.length) { report.noStrong++; continue; }
      const pt = m.LEXSenses?.find((s) => s.LanguageCode === "pt");
      if (!pt) { report.noPortuguese++; continue; }
      const glosses = (pt.Glosses ?? []).map(cleanHebrew).filter(Boolean);
      const definition = cleanHebrew(pt.DefinitionShort || pt.DefinitionLong) || null;
      const comments = cleanHebrew(pt.Comments) || null;
      if (!glosses.length && !definition) { report.empty++; continue; }
      assert(m.LEXID && e.Lemma, "Sentido sem ID ou lema");
      const refs = [...new Set((m.LEXReferences ?? []).flatMap((r) => {
        // Algumas ocorrências terminam em ! ou {N:001}; o versículo ocupa só 9 dígitos.
        const ref = osisRef(r.slice(0, 9));
        if (!ref) { report.invalidRefs++; return []; }
        return [ref];
      }))];
      for (const strong of strongs) {
        const mapped = [...new Set(refs.flatMap((ref) => {
          const target = mapVerse(ref, strong);
          if (!target) { report.unmarkedRefs++; return []; }
          if (target !== ref) report.remappedRefs++;
          return [target];
        }))];
        const row = { strong, sense_id: m.LEXID, lemma: e.Lemma, entry_code: m.LEXEntryCode || null,
          ord: order, glosses, definition, comments, domains: labels(m.LEXDomains),
          subdomains: labels(m.LEXSubDomains), refs: mapped };
        const key = `${strong}:${m.LEXID}`;
        assert(!rows.has(key), `Sentido duplicado: ${key}`);
        rows.set(key, row);
      }
    }
  }
  return { rows: [...rows.values()], report };
}
