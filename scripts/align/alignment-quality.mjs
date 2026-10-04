const EDGE = /^[\s.,;:!?"'“”‘’()\[\]—–-]|[\s.,;:!?"'“”‘’()\[\]—–-]$/;
export function fixEdges(spans) {
  const out = [];
  for (const x of spans) {
    if (!x || !x.s) { out.push({ t: x?.t ?? "", s: null }); continue; }
    let t = x.t ?? "";
    const lead = t.match(/^([\s.,;:!?"'“”‘’()\[\]—–-]+)/);
    if (lead) { out.push({ t: lead[1], s: null }); t = t.slice(lead[1].length); }
    const trail = t.match(/([\s.,;:!?"'“”‘’()\[\]—–-]+)$/);
    if (trail) {
      const core = t.slice(0, -trail[1].length);
      if (core) out.push({ t: core, s: x.s });
      out.push({ t: trail[1], s: null });
    } else if (t) out.push({ t, s: x.s });
  }
  const merged = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (last && !last.s && !s.s) last.t += s.t;
    else merged.push({ t: s.t, s: s.s || null });
  }
  return merged.filter((s) => s.t !== "");
}

export function attachOrphans(spans) {
  const out = spans.map((s) => ({ t: s.t ?? "", s: s.s || null }));
  for (let i = 0; i < out.length; i++) {
    if (out[i].s || !/[\p{L}\p{N}]/u.test(out[i].t)) continue;
    let j = i + 1;
    while (j < out.length && !out[j].s) j++;
    if (j < out.length) { out[j].t = out[i].t + out[j].t; out.splice(i, 1); i--; continue; }
    let k = i - 1;
    while (k >= 0 && !out[k].s) k--;
    if (k >= 0) { out[k].t = out[k].t + out[i].t; out.splice(i, 1); i--; }
  }
  const merged = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (last && !last.s && !s.s) last.t += s.t;
    else merged.push(s);
  }
  return merged.filter((s) => s.t !== "");
}

export function checkVerse(v, got) {
  if (!got || !Array.isArray(got.spans)) return "sem spans";
  if (got.spans.map((x) => x.t).join("") !== v.pt) return "texto diferente do original";
  const ok = new Set(v.greek.map((g) => g.s));
  for (const x of got.spans) {
    if (!x.s) {
      if (/[\p{L}\p{N}]/u.test(x.t)) return `trecho sem Strong com palavra: "${x.t}"`;
      continue;
    }
    if (!ok.has(x.s)) return `Strong ${x.s} fora do versículo`;
    if (EDGE.test(x.t)) return `trecho ligado com espaço/pontuação na ponta: "${x.t}"`;
  }
  return "";
}

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
export const indexedWords = (pt) => [...pt.matchAll(WORD)].map((m, i) => ({ p: i + 1, w: m[0] }));

// O modelo escolhe só o Strong por posição; o texto sempre vem da fonte local.
export function spansFromWordTags(v, got) {
  const source = [...v.pt.matchAll(WORD)];
  if (!Array.isArray(got?.tags) || got.tags.length !== source.length) return null;
  const tags = new Map(got.tags.map((tag) => [tag.p, tag.s]));
  if (tags.size !== source.length || source.some((_, i) => !tags.has(i + 1))) return null;
  const spans = [];
  let pos = 0;
  source.forEach((m, i) => {
    const strong = tags.get(i + 1);
    const gap = v.pt.slice(pos, m.index);
    const previous = spans.at(-1);
    if (previous?.s && previous.s === strong && /^\s*$/.test(gap)) previous.t += gap + m[0];
    else {
      if (gap) spans.push({ t: gap, s: null });
      spans.push({ t: m[0], s: strong });
    }
    pos = m.index + m[0].length;
  });
  if (pos < v.pt.length) spans.push({ t: v.pt.slice(pos), s: null });
  return { verse: v.verse, spans };
}
export function wordMarks(spans) {
  let text = "";
  const marks = [];
  for (const { t, s } of spans) { marks.push([text.length, s || null]); text += t; }
  return [...text.matchAll(WORD)].map((m) => ({ word: m[0], strong: marks.findLast(([start]) => start <= m.index)?.[1] ?? null }));
}

export function compareSpans(candidate, baseline) {
  if (candidate.map((s) => s.t).join("") !== baseline.map((s) => s.t).join("")) throw new Error("Textos diferentes na comparação");
  const a = wordMarks(candidate), b = wordMarks(baseline);
  let same = 0, both = 0;
  a.forEach((tag, i) => { if (tag.strong && b[i].strong) { both++; same += tag.strong === b[i].strong; } });
  return { same, both, words: a.length, linked: a.filter((t) => t.strong).length };
}

// Preserva cada trecho já ligado; usa o candidato somente nas lacunas.
export function fillOnlyGaps(candidate, baseline) {
  if (candidate.map((s) => s.t).join("") !== baseline.map((s) => s.t).join("")) throw new Error("Textos diferentes no preenchimento");
  const marks = [];
  let candidatePos = 0;
  for (const span of candidate) { marks.push([candidatePos, span.s]); candidatePos += span.t.length; }
  const strongAt = (pos) => marks.findLast(([start]) => start <= pos)?.[1] ?? null;
  const out = [];
  let pos = 0;
  for (const span of baseline) {
    if (span.s) out.push({ ...span });
    else {
      let last = 0;
      for (const word of span.t.matchAll(WORD)) {
        if (word.index > last) out.push({ t: span.t.slice(last, word.index), s: null });
        out.push({ t: word[0], s: strongAt(pos + word.index) });
        last = word.index + word[0].length;
      }
      if (last < span.t.length) out.push({ t: span.t.slice(last), s: null });
    }
    pos += span.t.length;
  }
  return out;
}

// Só restaura grafia/pontuação/espaços se a sequência inteira de letras e números
// for idêntica. Qualquer letra acrescentada, removida ou trocada impede o reparo.
export function restoreSourceText(v, got) {
  if (!Array.isArray(got?.spans) || got.spans.map((s) => s.t).join("") === v.pt) return got;
  const source = [...v.pt.matchAll(WORD)];
  const normalized = (text) => (text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().match(/[\p{L}\p{N}]/gu) ?? []);
  const candidate = got.spans.flatMap((span) => normalized(span.t).map((letter) => ({ letter, strong: span.s || null })));
  if (normalized(v.pt).join("") !== candidate.map((c) => c.letter).join("")) return got;
  const spans = [];
  let pos = 0, letters = 0;
  source.forEach((m) => {
    const strong = candidate[letters]?.strong ?? null;
    letters += normalized(m[0]).length;
    const gap = v.pt.slice(pos, m.index);
    const previous = spans.at(-1);
    if (previous?.s && previous.s === strong && /^\s*$/.test(gap)) previous.t += gap + m[0];
    else {
      if (gap) spans.push({ t: gap, s: null });
      spans.push({ t: m[0], s: strong });
    }
    pos = m.index + m[0].length;
  });
  if (pos < v.pt.length) spans.push({ t: v.pt.slice(pos), s: null });
  return { ...got, spans };
}

