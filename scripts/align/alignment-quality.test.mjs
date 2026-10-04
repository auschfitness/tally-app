import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVerse, fixEdges, wordMarks, compareSpans, restoreSourceText, spansFromWordTags, fillOnlyGaps } from "./alignment-quality.mjs";

test("valida texto completo, cobertura e Strong do próprio versículo", () => {
  const v = { pt: "No princípio criou.", greek: [{ s: "H7225" }, { s: "H1254" }] };
  const spans = [{ t: "No princípio", s: "H7225" }, { t: " ", s: null }, { t: "criou", s: "H1254" }, { t: ".", s: null }];
  assert.equal(checkVerse(v, { spans }), "");
  assert.match(checkVerse(v, { spans: spans.map((s) => ({ ...s, s: s.s === "H1254" ? "H0001" : s.s })) }), /fora do versículo/);
  assert.match(checkVerse(v, { spans: spans.map((s) => ({ ...s, s: null })) }), /sem Strong/);
  assert.match(checkVerse({ ...v, pt: "Texto alterado" }, { spans }), /diferente/);
});
test("corrige bordas sem mudar o texto", () => {
  const spans = [{ t: " criar, ", s: "H1254" }];
  const fixed = fixEdges(spans);
  assert.equal(fixed.map((s) => s.t).join(""), " criar, ");
  assert.deepEqual(fixed, [{ t: " ", s: null }, { t: "criar", s: "H1254" }, { t: ", ", s: null }]);
});
test("métrica conta a palavra inteira mesmo quando há divisão em trechos", () => {
  const candidate = [{ t: "d'", s: "H1" }, { t: "água", s: "H2" }];
  assert.equal(wordMarks(candidate).length, 1);
  assert.deepEqual(compareSpans(candidate, [{ t: "d'água", s: "H1" }]), { same: 1, both: 1, words: 1, linked: 1 });
  assert.throws(() => compareSpans(candidate, [{ t: "outro", s: "H1" }]), /Textos diferentes/);
});
test("restaura grafia do texto fonte, sem aceitar palavras removidas ou alteradas", () => {
  const source = { pt: "João, filho de Abraão." };
  const got = { spans: [{ t: "Joao filho de Abraao", s: "H1" }] };
  const fixed = restoreSourceText(source, got);
  assert.equal(fixed.spans.map((s) => s.t).join(""), source.pt);
  assert.equal(wordMarks(fixed.spans).every((s) => s.strong === "H1"), true);
  const changed = { spans: [{ t: "João filho de Isaque", s: "H1" }] };
  assert.equal(restoreSourceText(source, changed), changed);
  const missing = { spans: [{ t: "João Abraão", s: "H1" }] };
  assert.equal(restoreSourceText(source, missing), missing);
});
test("restaura espaço omitido entre trechos sem mudar a ligação das palavras", () => {
  const got = { spans: [{ t: "de", s: "H1035" }, { t: "Belém", s: "H1035" }, { t: " de Judá", s: "H3063" }] };
  const fixed = restoreSourceText({ pt: "de Belém de Judá" }, got);
  assert.equal(fixed.spans.map((s) => s.t).join(""), "de Belém de Judá");
  assert.deepEqual(wordMarks(fixed.spans).map((s) => s.strong), ["H1035", "H1035", "H3063", "H3063"]);
});
test("tags por posição preservam o texto e recusam posições ausentes ou duplicadas", () => {
  const source = { verse: 1, pt: "No princípio, criou.", greek: [{ s: "H7225" }, { s: "H1254" }] };
  const fixed = spansFromWordTags(source, { tags: [{ p: 1, s: "H7225" }, { p: 2, s: "H7225" }, { p: 3, s: "H1254" }] });
  assert.equal(checkVerse(source, fixed), "");
  assert.deepEqual(fixed.spans, [{ t: "No princípio", s: "H7225" }, { t: ", ", s: null }, { t: "criou", s: "H1254" }, { t: ".", s: null }]);
  assert.equal(spansFromWordTags(source, { tags: [{ p: 1, s: "H7225" }] }), null);
  assert.equal(spansFromWordTags(source, { tags: [{ p: 1, s: "H7225" }, { p: 1, s: "H7225" }, { p: 3, s: "H1254" }] }), null);
});
test("preenchimento mantém Strong existente mesmo se o candidato discordar", () => {
  const baseline = [{ t: "No princípio", s: "H7225" }, { t: " criou ", s: null }, { t: "Deus", s: "H0430" }];
  const candidate = [{ t: "No princípio", s: "H0001" }, { t: " ", s: null }, { t: "criou", s: "H1254" }, { t: " ", s: null }, { t: "Deus", s: "H0002" }];
  const out = fillOnlyGaps(candidate, baseline);
  assert.equal(out.map((s) => s.t).join(""), "No princípio criou Deus");
  assert.deepEqual(wordMarks(out).map((s) => s.strong), ["H7225", "H7225", "H1254", "H0430"]);
  assert.deepEqual(out[0], baseline[0]);
  assert.deepEqual(out.at(-1), baseline.at(-1));
});
