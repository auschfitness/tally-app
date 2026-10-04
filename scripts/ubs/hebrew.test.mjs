import { test } from "node:test";
import assert from "node:assert/strict";
import { hebrewRows, cleanHebrew } from "./hebrew-data.mjs";
import { cleanUbs, osisRef } from "./ubs-text.mjs";
import { verseMapper } from "./hebrew-versification.mjs";

const meaning = (id, extra = {}) => ({ LEXID: id, LEXReferences: ["00100100100006{N:001}", "00100100100008"],
  LEXSenses: [{ LanguageCode: "pt", Glosses: ["criar"], DefinitionShort: "= trazer à existência", Comments: "" }], ...extra });
test("hebraico e aramaico usam H, mantêm ordem e referências distintas", () => {
  const { rows } = hebrewRows([{ Lemma: "ברא", StrongCodes: ["H1254", "A0004", "H1254"],
    BaseForms: [{ LEXMeanings: [meaning("first"), meaning("second")] }] }], []);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => [r.strong, r.ord]), [["H1254", 0], ["H0004", 0], ["H1254", 1], ["H0004", 1]]);
  assert.deepEqual(rows[0].refs, ["Gen.1.1"]);
  assert.equal(rows[0].definition, "trazer à existência");
});
test("sentidos sem PT ou vazios não entram como tradução", () => {
  const { rows, report } = hebrewRows([{ Lemma: "א", StrongCodes: ["H1"], BaseForms: [{ LEXMeanings: [
    meaning("no-pt", { LEXSenses: [{ LanguageCode: "en", DefinitionShort: "English" }] }),
    meaning("empty", { LEXSenses: [{ LanguageCode: "pt", Glosses: [], DefinitionShort: "" }] }), meaning("ok"),
  ] }] }], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ord, 2);
  assert.equal(report.noPortuguese, 1);
  assert.equal(report.empty, 1);
});
test("domínios portugueses e rótulos complementares, sem inglês", () => {
  const { rows } = hebrewRows([{ Lemma: "א", StrongCodes: ["H1"], BaseForms: [{ LEXMeanings: [meaning("id", {
    LEXDomains: [{ DomainCode: "001002007", Domain: "Vegetation" }, { DomainCode: "foo", Domain: "English" }],
  })] }] }], [{ Code: "foo", SemanticDomainLocalizations: [{ LanguageCode: "pt", Label: "Existir" }] }]);
  assert.deepEqual(rows[0].domains, ["Vegetação", "Existir"]);
});
test("limpeza de UBS mantém texto hebraico e traduções citadas", () => {
  assert.equal(cleanHebrew("= ver {L:ברא<SDBH:ברא>}[a] em {S:00100100100006}, {A:ARA} | outro"), "ver ברא em Gn 1.1, ARA\n\noutro");
  assert.equal(cleanUbs("ver {S:04000300700022} e {S:06601100600052}"), "ver Mt 3.7 e Ap 11.6");
  assert.equal(osisRef("049004005"), "Eph.4.5");
  assert.equal(osisRef("027005002"), "Dan.5.2");
  assert.equal(osisRef("000001001"), null);
});
test("duplicata Strong/sentido impede gerar carga", () => {
  assert.throws(() => hebrewRows([{ Lemma: "א", StrongCodes: ["H1"], BaseForms: [{ LEXMeanings: [meaning("same"), meaning("same")] }] }], []), /duplicado/);
});
test("numeração massorética vira a do leitor; marcações ambíguas ficam sem seleção", () => {
  const map = verseMapper(["Psa.51.10(51.12)#03=L\tברא\tx\tcreate\t{H1254A}\nPsa.51.11(51.13)#01=L\tx\tx\tx\tH1\nPsa.51.12(51.13)#01=L\tx\tx\tx\tH1"]);
  assert.equal(map("Ps.51.12", "H1254"), "Ps.51.10");
  assert.equal(map("Ps.51.13", "H1"), null);
  assert.equal(map("Gen.1.1", "H1254"), "Gen.1.1");
  assert.equal(map("Ps.51.12", "H9999"), null);
});
