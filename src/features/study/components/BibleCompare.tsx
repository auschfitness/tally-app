"use client";

// Estudo do Texto — hub de estudo da passagem (a passagem é a estrela). Reframe do
// antigo "Comparar Bíblia": comparar traduções vira UMA das lentes. Abas de revelação
// progressiva (Traduções ativa; Original/Palavras-chave/Contexto/Referências/Notas
// como placeholders elegantes até o dado chegar do orquestrador). Texto vem da Free
// Use Bible API (helloao, client-side); nada no nosso banco. Arquitetura AGNÓSTICA de
// tradução — nunca hard-code de versão; só domínio público (o gate vive na fonte;
// uma fonte licenciada futura, ESV/NIV, seria barrada ali). Interlinear grego/hebraico
// e o resto das lentes chegam nas Fases 2+.
//
// Persistência de preferência do pastor (favoritos + histórico) fica em localStorage
// por aparelho (cross-device fica p/ depois). Diff de versões é calculado no cliente.
import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/components/shared/Select";
import { createClient } from "@/lib/supabase/client";
import { BOOKS, bookName } from "@/lib/bible/books";
import { fetchPassage, listTranslations, type PassageVerse, type Translation } from "@/lib/bible/source";
import { usfmToOsis, osisToUsfm } from "@/lib/bible/osis";
import { aggregateRelated, type CrossRefRow, type RelatedRef } from "@/lib/bible/crossref";
import { decodeMorph } from "@/lib/bible/morph";
import { buildKeywords, type Keyword } from "@/lib/bible/keywords";
import type { ScriptureRef } from "@/lib/bible/parse";
import styles from "../study.module.css";

type LangCode = "por" | "eng" | "spa";

function localeToLang(locale: string): LangCode {
  if ((locale || "").startsWith("en")) return "eng";
  if ((locale || "").startsWith("es")) return "spa";
  return "por";
}

// Lista curada por idioma: poucas versões conhecidas de domínio público mostradas
// por padrão; o resto (Septuaginta, Targums, dezenas de revisões em inglês…) fica
// atrás de "Mais versões". Tokens casam por substring em id/nome (robusto a variações
// de id da helloao). O gate de licença de domínio público já existe na fonte.
const CURATED: Record<LangCode, string[]> = {
  por: ["ALMEIDA", "ARC", "ACF", "ARA", "NAA"],
  eng: ["BSB", "BEREAN", "WORLD ENGLISH", "WEB", "KING JAMES", "KJV", "AMERICAN STANDARD", "ASV"],
  spa: ["REINA", "VALERA", "RVA", "RVR", "RVG"],
};
function isCurated(t: Translation, lang: LangCode): boolean {
  const hay = `${t.id} ${t.shortName} ${t.name} ${t.englishName}`.toUpperCase();
  return CURATED[lang].some((tok) => hay.includes(tok));
}

// --- Preferências por aparelho (localStorage). Guardadas por chave estável. ---
const FAV_KEY = "tally.bible.favVersions";
const HIST_KEY = "tally.bible.history";
const HIST_MAX = 8;

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* cota cheia / modo privado — ignorar */
  }
}

interface CmpRef {
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
}
interface HistItem {
  key: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  label: string;
}
type ColResult =
  | { status: "loading" }
  | { status: "error"; error?: string }
  | { status: "ok"; verses: PassageVerse[] };

function refKeyOf(r: CmpRef): string {
  return r.book + "-" + r.chapter + "-" + (r.verse_start || "") + "-" + (r.verse_end || "");
}
function labelForRef(r: CmpRef): string {
  return (
    bookName(r.book) +
    " " +
    r.chapter +
    (r.verse_start ? ":" + r.verse_start + (r.verse_end && r.verse_end !== r.verse_start ? "-" + r.verse_end : "") : "")
  );
}

// Normaliza uma palavra p/ comparação de diff: minúscula, sem pontuação nas pontas.
function normWord(w: string): string {
  return w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

// Diff por versículo entre as versões escolhidas: para cada nº de versículo, devolve o
// conjunto de palavras COMUNS a todas as versões que têm aquele versículo. Uma palavra
// fora desse conjunto é uma divergência (destacada). Só marca quando 2+ versões têm o
// versículo — versão única não gera destaque.
function commonWordsByVerse(results: Record<string, ColResult>, picks: string[]): Map<number, Set<string>> {
  const perVerse = new Map<number, Set<string>[]>();
  for (const id of picks) {
    const res = results[id];
    if (!res || res.status !== "ok") continue;
    for (const v of res.verses) {
      const toks = new Set(v.text.split(/\s+/).map(normWord).filter(Boolean));
      if (!perVerse.has(v.n)) perVerse.set(v.n, []);
      perVerse.get(v.n)!.push(toks);
    }
  }
  const out = new Map<number, Set<string>>();
  for (const [n, sets] of perVerse) {
    if (sets.length < 2) continue; // nada a comparar
    let common = new Set(sets[0]);
    for (let i = 1; i < sets.length; i++) {
      const next = new Set<string>();
      for (const w of common) if (sets[i]!.has(w)) next.add(w);
      common = next;
    }
    out.set(n, common);
  }
  return out;
}

const TABS = [
  { key: "trans", label: "Traduções" },
  { key: "original", label: "Original" },
  { key: "keywords", label: "Palavras-chave" },
  { key: "context", label: "Contexto" },
  { key: "refs", label: "Referências" },
  { key: "notes", label: "Notas" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Abas ainda sem dado (placeholders "Em breve"). Traduções/Referências/Original/
// Palavras-chave têm conteúdo próprio e não entram aqui.
const PLACEHOLDERS: Record<Exclude<TabKey, "trans" | "refs" | "original" | "keywords">, { title: string; desc: string }> = {
  context: {
    title: "Contexto",
    desc: "Autor, data, público e tema do texto, na voz do Tally. Em breve.",
  },
  notes: {
    title: "Notas de estudo",
    desc: "Suas anotações sobre o texto, guardadas junto do estudo. Em breve.",
  },
};

interface RelatedState {
  key: string;
  status: "loading" | "ok" | "error";
  items: RelatedRef[];
}

// Token do texto original (bible_original_tokens) + entrada do léxico (strongs_lexicon).
interface OrigToken {
  verse: number;
  position: number;
  surface: string;
  lemma: string | null;
  strong: string | null;
  morph: string | null;
  gloss: string | null;
  translit: string | null;
}
interface LexEntry {
  strong: string;
  lemma: string | null;
  translit: string | null;
  pronunciation: string | null;
  gloss: string | null;
  definition: string | null;
}
interface OriginalState {
  key: string;
  status: "loading" | "ok" | "error";
  lang: string;
  tokens: OrigToken[];
  lex: Record<string, LexEntry>;
}
// Frequência global por Strong (strong_frequency), buscada por passagem.
interface FreqState {
  key: string;
  map: Record<string, number>;
}
// Ocorrências de UM Strong no cânone (aba Palavras-chave → "ver ocorrências").
interface OccState {
  strong: string;
  status: "loading" | "ok" | "error";
  refs: RelatedRef[];
}

export function BibleCompare({
  initialRef,
  locale,
  onAddToSermon,
  onClose,
}: {
  initialRef?: ScriptureRef | null;
  locale: string;
  onAddToSermon?: (block: string) => void;
  onClose: () => void;
}) {
  const [ref, setRef] = useState<CmpRef>(() =>
    initialRef && initialRef.book
      ? { book: initialRef.book, chapter: initialRef.chapter, verse_start: initialRef.verse_start, verse_end: initialRef.verse_end }
      : { book: "JHN", chapter: 3, verse_start: 16, verse_end: null },
  );
  const lang = localeToLang(locale);
  const [translations, setTranslations] = useState<Translation[] | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [results, setResults] = useState<Record<string, ColResult>>({});
  const [chapStr, setChapStr] = useState(ref.chapter ? String(ref.chapter) : "");
  const [vsStr, setVsStr] = useState(ref.verse_start ? String(ref.verse_start) : "");
  const [veStr, setVeStr] = useState(ref.verse_end ? String(ref.verse_end) : "");

  const [tab, setTab] = useState<TabKey>("trans");
  const [diffOn, setDiffOn] = useState(true);
  // Preferências por aparelho — só o cliente renderiza este componente (fica atrás de
  // um estado aberto por interação), então ler o localStorage no init é seguro.
  const [favs, setFavs] = useState<string[]>(() => readLS<string[]>(FAV_KEY, []));
  const [history, setHistory] = useState<HistItem[]>(() => readLS<HistItem[]>(HIST_KEY, []));
  const [related, setRelated] = useState<RelatedState>({ key: "", status: "ok", items: [] });
  // Passagem já buscada (ou em busca) na aba Referências — dedupe SEM entrar nas deps do
  // efeito (senão o setRelated de "loading" reexecutaria o efeito e cancelaria a própria
  // busca via cleanup, prendendo em "Buscando…").
  const fetchedRefKey = useRef<string>("");

  const [original, setOriginal] = useState<OriginalState>({ key: "", status: "ok", lang: "", tokens: [], lex: {} });
  const [selTok, setSelTok] = useState<string>(""); // "verse-position" da palavra tocada
  const fetchedOrigKey = useRef<string>("");

  const [freq, setFreq] = useState<FreqState>({ key: "", map: {} });
  const fetchedFreqKey = useRef<string>("");
  const [openKw, setOpenKw] = useState<string>(""); // Strong da palavra-chave expandida
  const [occ, setOcc] = useState<OccState>({ strong: "", status: "ok", refs: [] });

  useEffect(() => {
    let alive = true;
    listTranslations()
      .then((list) => alive && setTranslations(list))
      .catch(() => alive && setTranslations([]));
    return () => {
      alive = false;
    };
  }, []);

  // Registra a passagem inicial no histórico, uma vez.
  useEffect(() => {
    if (ref.book && ref.chapter) pushHistory(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Referências cruzadas (TSK) — busca sob demanda quando a aba "Referências" está
  // aberta, refazendo quando a passagem muda. Consulta a tabela GLOBAL cross_references
  // (leitura livre) pelo cliente do navegador; a lógica de mapeamento/ordenação é pura
  // (lib/bible/crossref). Uma vez tentada uma passagem, não refaz (nem em erro) até a
  // passagem mudar. Se os dados ainda não foram carregados (m33 vazio), volta vazio.
  useEffect(() => {
    if (tab !== "refs") return;
    const key = refKeyOf(ref);
    if (fetchedRefKey.current === key) return; // já buscado (ou em busca) esta passagem
    fetchedRefKey.current = key;
    const osis = usfmToOsis(ref.book);
    if (!osis || !ref.chapter) {
      setRelated({ key, status: "ok", items: [] });
      return;
    }
    let alive = true;
    setRelated({ key, status: "loading", items: [] });
    const supabase = createClient();
    let q = supabase
      .from("cross_references")
      .select("to_book,to_chapter,to_verse_start,to_verse_end,votes")
      .eq("from_book", osis)
      .eq("from_chapter", ref.chapter);
    if (ref.verse_start) {
      const ve = ref.verse_end && ref.verse_end >= ref.verse_start ? ref.verse_end : ref.verse_start;
      const verses: number[] = [];
      for (let n = ref.verse_start; n <= ve; n++) verses.push(n);
      q = q.in("from_verse", verses);
    }
    void q
      .order("votes", { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          fetchedRefKey.current = ""; // erro → permite nova tentativa ao revisitar
          setRelated({ key, status: "error", items: [] });
          return;
        }
        setRelated({ key, status: "ok", items: aggregateRelated((data ?? []) as CrossRefRow[], 12) });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ref]);

  // Texto original (STEPBible) — busca sob demanda na aba "Original". Mesmo padrão da
  // aba Referências (dedupe por useRef, deps [tab, ref]). Busca os tokens da passagem e,
  // num 2º passo, o léxico dos Strong presentes (para enriquecer o popover). Vazio
  // elegante enquanto o banco (m34) não tiver os dados.
  useEffect(() => {
    if (tab !== "original" && tab !== "keywords") return;
    const key = refKeyOf(ref);
    if (fetchedOrigKey.current === key) return;
    fetchedOrigKey.current = key;
    setSelTok("");
    const osis = usfmToOsis(ref.book);
    if (!osis || !ref.chapter) {
      setOriginal({ key, status: "ok", lang: "", tokens: [], lex: {} });
      return;
    }
    let alive = true;
    setOriginal({ key, status: "loading", lang: "", tokens: [], lex: {} });
    const supabase = createClient();
    let q = supabase
      .from("bible_original_tokens")
      .select("verse,position,surface,lemma,strong,morph,gloss,translit,lang")
      .eq("book", osis)
      .eq("chapter", ref.chapter);
    if (ref.verse_start) {
      const ve = ref.verse_end && ref.verse_end >= ref.verse_start ? ref.verse_end : ref.verse_start;
      const verses: number[] = [];
      for (let n = ref.verse_start; n <= ve; n++) verses.push(n);
      q = q.in("verse", verses);
    }
    void q
      .order("verse", { ascending: true })
      .order("position", { ascending: true })
      .limit(2000)
      .then(async ({ data, error }) => {
        if (!alive) return;
        if (error) {
          fetchedOrigKey.current = "";
          setOriginal({ key, status: "error", lang: "", tokens: [], lex: {} });
          return;
        }
        const tokens = (data ?? []) as (OrigToken & { lang: string })[];
        const lang = tokens[0]?.lang || "";
        // 2º passo: léxico dos Strong presentes (enriquecimento do popover).
        const strongs = [...new Set(tokens.map((t) => t.strong).filter((s): s is string => !!s))];
        const lex: Record<string, LexEntry> = {};
        if (strongs.length) {
          const { data: lx } = await supabase
            .from("strongs_lexicon")
            .select("strong,lemma,translit,pronunciation,gloss,definition")
            .in("strong", strongs);
          for (const e of (lx ?? []) as LexEntry[]) lex[e.strong] = e;
        }
        if (!alive) return;
        setOriginal({ key, status: "ok", lang, tokens, lex });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ref]);

  // Frequência global (strong_frequency) dos Strong da passagem — para ranquear as
  // palavras-chave (raras primeiro). Busca quando a aba está aberta e os tokens chegaram.
  useEffect(() => {
    if (tab !== "keywords" || original.status !== "ok") return;
    const key = refKeyOf(ref);
    if (fetchedFreqKey.current === key) return;
    const strongs = [...new Set(original.tokens.map((t) => t.strong).filter((s): s is string => !!s))];
    if (!strongs.length) {
      fetchedFreqKey.current = key;
      setFreq({ key, map: {} });
      return;
    }
    fetchedFreqKey.current = key;
    setOpenKw("");
    let alive = true;
    const supabase = createClient();
    void supabase
      .from("strong_frequency")
      .select("strong,occurrences")
      .in("strong", strongs)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          fetchedFreqKey.current = "";
          return;
        }
        const map: Record<string, number> = {};
        for (const r of (data ?? []) as { strong: string; occurrences: number }[]) map[r.strong] = r.occurrences;
        setFreq({ key, map });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ref, original.status]);

  // "Ver ocorrências" de uma palavra-chave: versículos onde aquele Strong aparece.
  useEffect(() => {
    if (!openKw) return;
    let alive = true;
    setOcc({ strong: openKw, status: "loading", refs: [] });
    const supabase = createClient();
    void supabase
      .from("bible_original_tokens")
      .select("book,chapter,verse")
      .eq("strong", openKw)
      .order("book", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse", { ascending: true })
      .limit(400)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setOcc({ strong: openKw, status: "error", refs: [] });
          return;
        }
        const seen = new Set<string>();
        const refs: RelatedRef[] = [];
        for (const r of (data ?? []) as { book: string; chapter: number; verse: number }[]) {
          const usfm = osisToUsfm(r.book);
          if (!usfm) continue;
          const k = `${usfm}-${r.chapter}-${r.verse}`;
          if (seen.has(k)) continue; // 1 chip por versículo (a palavra pode repetir no versículo)
          seen.add(k);
          refs.push({ book: usfm, chapter: r.chapter, verse_start: r.verse, verse_end: null, label: labelForRef({ book: usfm, chapter: r.chapter, verse_start: r.verse, verse_end: null }), votes: 0 });
          if (refs.length >= 40) break;
        }
        setOcc({ strong: openKw, status: "ok", refs });
      });
    return () => {
      alive = false;
    };
  }, [openKw]);

  // Palavras-chave da passagem (puro): descarta funcionais, agrupa por Strong, ranqueia.
  const keywords = useMemo<Keyword[]>(() => {
    if (original.status !== "ok") return [];
    return buildKeywords(
      original.tokens.map((t) => ({ strong: t.strong, lemma: t.lemma, morph: t.morph, gloss: t.gloss })),
      original.lang,
      original.lex,
      freq.key === refKeyOf(ref) ? freq.map : {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, freq, ref]);

  const versionsForLang = useMemo(
    () => (translations ?? []).filter((t) => (t.language || "").toLowerCase() === lang),
    [translations, lang],
  );

  // Poucas versões por padrão (curadas + favoritas); o resto atrás de "Mais versões".
  // Se nada casar a curadoria nesta língua, mostra as 3 primeiras (nunca padrão vazio).
  const { primary, extra } = useMemo(() => {
    const favSet = new Set(favs);
    const isPrimary = (t: Translation) => isCurated(t, lang) || favSet.has(t.id);
    const cur = versionsForLang.filter(isPrimary);
    if (cur.length) return { primary: cur, extra: versionsForLang.filter((t) => !isPrimary(t)) };
    return { primary: versionsForLang.slice(0, 3), extra: versionsForLang.slice(3) };
  }, [versionsForLang, lang, favs]);

  function runFor(ids: string[], r: CmpRef) {
    if (!ids.length) return;
    setResults((prev) => {
      const n = { ...prev };
      for (const id of ids) n[id] = { status: "loading" };
      return n;
    });
    for (const id of ids) {
      void fetchPassage(r, id).then((res) => {
        setResults((prev) => ({
          ...prev,
          [id]: res.ok ? { status: "ok", verses: res.verses } : { status: "error", error: res.error },
        }));
      });
    }
  }

  // Ao carregar as versões: pré-seleciona as favoritas disponíveis nesta língua; sem
  // favoritas, as 2 primeiras curadas. Depois busca.
  useEffect(() => {
    if (!translations) return;
    const favAvail = favs.filter((id) => versionsForLang.some((t) => t.id === id));
    const def = (favAvail.length ? favAvail : primary.map((t) => t.id)).slice(0, favAvail.length ? 3 : 2);
    setPicks(def);
    runFor(def, ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translations, lang]);

  function pushHistory(r: CmpRef) {
    const key = refKeyOf(r);
    setHistory((prev) => {
      const next = [
        { key, book: r.book, chapter: r.chapter, verse_start: r.verse_start, verse_end: r.verse_end, label: labelForRef(r) },
        ...prev.filter((h) => h.key !== key),
      ].slice(0, HIST_MAX);
      writeLS(HIST_KEY, next);
      return next;
    });
  }
  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeLS(FAV_KEY, next);
      return next;
    });
  }

  function applyInputs(): CmpRef {
    const r: CmpRef = {
      book: ref.book,
      chapter: parseInt(chapStr, 10) || ref.chapter,
      verse_start: parseInt(vsStr, 10) || null,
      verse_end: parseInt(veStr, 10) || null,
    };
    setRef(r);
    return r;
  }
  function openNow() {
    const r = applyInputs();
    runFor(picks, r);
    pushHistory(r);
  }
  function wholeChapter() {
    const r: CmpRef = { ...ref, chapter: parseInt(chapStr, 10) || ref.chapter, verse_start: null, verse_end: null };
    setRef(r);
    setVsStr("");
    setVeStr("");
    runFor(picks, r);
    pushHistory(r);
  }
  function selectHistory(h: HistItem) {
    const r: CmpRef = { book: h.book, chapter: h.chapter, verse_start: h.verse_start, verse_end: h.verse_end };
    setRef(r);
    setChapStr(String(h.chapter));
    setVsStr(h.verse_start ? String(h.verse_start) : "");
    setVeStr(h.verse_end ? String(h.verse_end) : "");
    setTab("trans");
    runFor(picks, r);
    pushHistory(r);
  }
  function openRelated(rr: RelatedRef) {
    const r: CmpRef = { book: rr.book, chapter: rr.chapter, verse_start: rr.verse_start, verse_end: rr.verse_end };
    setRef(r);
    setChapStr(String(rr.chapter));
    setVsStr(String(rr.verse_start));
    setVeStr(rr.verse_end ? String(rr.verse_end) : "");
    setTab("trans");
    runFor(picks, r);
    pushHistory(r);
  }
  function togglePick(id: string) {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      runFor([id], ref);
      return [...prev, id];
    });
  }

  const refLabel = labelForRef(ref);

  function labelFor(id: string): string {
    const tr = (translations ?? []).find((t) => t.id === id);
    const nm = tr?.name || tr?.shortName || id;
    return nm + (tr?.shortName ? ` (${tr.shortName})` : "");
  }
  function blockFor(id: string): string {
    const res = results[id];
    if (!res || res.status !== "ok") return "";
    const short = (translations ?? []).find((t) => t.id === id)?.shortName || id;
    const text = res.verses.map((v) => v.n + " " + v.text).join(" ");
    return `${refLabel} (${short})\n${text}`;
  }

  const okPicks = picks.filter((id) => results[id]?.status === "ok");
  const common = useMemo(
    () => (diffOn && okPicks.length >= 2 ? commonWordsByVerse(results, picks) : new Map<number, Set<string>>()),
    [diffOn, okPicks.length, results, picks],
  );

  // Renderiza um versículo, destacando as palavras que divergem entre as versões.
  function renderVerse(v: PassageVerse) {
    const commonSet = common.get(v.n);
    return (
      <span key={v.n}>
        <sup style={{ color: "var(--text-2)", marginRight: 3 }}>{v.n}</sup>
        {!commonSet
          ? v.text + " "
          : v.text.split(/(\s+)/).map((seg, i) => {
              if (/^\s+$/.test(seg) || seg === "") return seg;
              const nw = normWord(seg);
              const diff = nw && !commonSet.has(nw);
              return diff ? (
                <mark key={i} className={styles.cmpDiff}>
                  {seg}
                </mark>
              ) : (
                <span key={i}>{seg}</span>
              );
            })}
        {commonSet ? " " : null}
      </span>
    );
  }

  const cols = Math.min(picks.length, 3);
  const firstOk = okPicks[0];

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`modal ${styles.cmp}`} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.cmpHead}>
          <div>
            <div className={styles.stEyebrow}>Estudo do Texto</div>
            <h2 className={styles.stRef}>{refLabel}</h2>
          </div>
          {onAddToSermon ? (
            <button
              className="btn sm"
              type="button"
              style={{ marginLeft: "auto" }}
              disabled={!firstOk}
              onClick={() => {
                if (firstOk) {
                  onAddToSermon(blockFor(firstOk));
                  onClose();
                }
              }}
            >
              → Adicionar ao sermão
            </button>
          ) : null}
          <button className="iconbtn" type="button" aria-label="Fechar" style={onAddToSermon ? undefined : { marginLeft: "auto" }} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Seletor da passagem (a estrela) + histórico recente */}
        <div className={styles.cmpSel}>
          <Select value={ref.book} compact onChange={(e) => setRef((r) => ({ ...r, book: e.target.value }))}>
            {BOOKS.map((b) => <option key={b.code} value={b.code}>{b.pt}</option>)}
          </Select>
          <input type="number" min={1} placeholder="cap" value={chapStr} onChange={(e) => setChapStr(e.target.value)} style={{ width: 62 }} />
          <input type="number" min={1} placeholder="v. ini" value={vsStr} onChange={(e) => setVsStr(e.target.value)} style={{ width: 62 }} />
          <input type="number" min={1} placeholder="v. fim" value={veStr} onChange={(e) => setVeStr(e.target.value)} style={{ width: 62 }} />
          <button className="btn" type="button" onClick={openNow}>Ver passagem</button>
          <button className="link" type="button" onClick={wholeChapter}>Capítulo inteiro</button>
        </div>
        {history.length > 1 ? (
          <div className={styles.stHist}>
            <span className={styles.stHistLabel}>Recentes</span>
            {history.filter((h) => h.key !== refKeyOf(ref)).slice(0, 6).map((h) => (
              <button key={h.key} type="button" className={styles.stHistChip} onClick={() => selectHistory(h)}>
                {h.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Abas de revelação progressiva */}
        <div className={styles.stTabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`${styles.stTab}${tab === t.key ? " " + styles.on : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "keywords" ? (
          <div className={styles.stKw}>
            {original.status === "loading" ? (
              <div className="muted">Analisando as palavras…</div>
            ) : original.status === "error" ? (
              <div className="muted">Não foi possível carregar as palavras agora.</div>
            ) : keywords.length === 0 ? (
              <div className={styles.stPh}>
                <div className={styles.stPhTitle}>Palavras-chave em breve</div>
                <div className="muted" style={{ maxWidth: 380 }}>
                  Sem palavras de conteúdo para <b>{refLabel}</b> ainda. Elas vêm do texto original (grego/hebraico) — aparecem assim que a base for carregada.
                </div>
              </div>
            ) : (
              <>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Palavras de conteúdo de <b>{refLabel}</b> · as mais <b>raras</b> no cânone primeiro
                </div>
                <ul className={styles.stKwList}>
                  {keywords.map((k) => {
                    const on = openKw === k.strong;
                    return (
                      <li key={k.strong} className={styles.stKwItem}>
                        <button type="button" className={`${styles.stKwHead}${on ? " " + styles.on : ""}`} onClick={() => setOpenKw(on ? "" : k.strong)}>
                          <span className={styles.stKwLemma} lang={original.lang === "hbo" ? "he" : "el"} dir={original.lang === "hbo" ? "rtl" : "ltr"}>{k.lemma}</span>
                          <span className={styles.stKwMeaning}>{k.meaning || "—"}</span>
                          <span className={styles.stKwMeta}>
                            {k.count > 1 ? <span className={styles.stKwCount}>{k.count}× aqui</span> : null}
                            <span className={styles.stKwFreq}>{k.occurrences != null ? `${k.occurrences}× no cânone` : "freq. —"}</span>
                          </span>
                        </button>
                        {on ? (
                          <div className={styles.stKwOcc}>
                            {occ.strong !== k.strong || occ.status === "loading" ? (
                              <span className="muted">Buscando ocorrências…</span>
                            ) : occ.status === "error" ? (
                              <span className="muted">Não foi possível carregar as ocorrências.</span>
                            ) : occ.refs.length === 0 ? (
                              <span className="muted">Sem outras ocorrências no texto disponível.</span>
                            ) : (
                              <>
                                <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>Onde mais aparece (Strong {k.strong})</div>
                                <div className={styles.stRelChips}>
                                  {occ.refs.map((rr) => (
                                    <button key={rr.label} type="button" className={styles.stRelChip} onClick={() => openRelated(rr)}>{rr.label}</button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className={styles.stCredit}>Dados originais © STEPBible.org, CC BY 4.0.</div>
          </div>
        ) : tab === "original" ? (
          <div className={styles.stOrig}>
            {original.status === "loading" ? (
              <div className="muted">Carregando o texto original…</div>
            ) : original.status === "error" ? (
              <div className="muted">Não foi possível carregar o texto original agora.</div>
            ) : original.tokens.length === 0 ? (
              <div className={styles.stPh}>
                <div className={styles.stPhTitle}>Texto original em breve</div>
                <div className="muted" style={{ maxWidth: 380 }}>
                  Ainda não temos o grego/hebraico de <b>{refLabel}</b>. Assim que a base do original for carregada, esta aba mostra a passagem palavra a palavra, com Strong e morfologia.
                </div>
              </div>
            ) : (
              <>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  {original.lang === "hbo" ? "Hebraico" : "Grego"} · toque numa palavra para ver Strong, lema e morfologia
                </div>
                <div className={styles.stOrigText} dir={original.lang === "hbo" ? "rtl" : "ltr"} lang={original.lang === "hbo" ? "he" : "el"}>
                  {[...new Set(original.tokens.map((t) => t.verse))].map((vn) => (
                    <span key={vn} className={styles.stOrigVerse}>
                      <sup className={styles.stOrigVn} dir="ltr">{vn}</sup>
                      {original.tokens.filter((t) => t.verse === vn).map((t) => {
                        const id = `${t.verse}-${t.position}`;
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`${styles.stWord}${selTok === id ? " " + styles.on : ""}`}
                            onClick={() => setSelTok(selTok === id ? "" : id)}
                          >
                            {t.surface}
                          </button>
                        );
                      })}
                    </span>
                  ))}
                </div>
                {(() => {
                  const t = original.tokens.find((x) => `${x.verse}-${x.position}` === selTok);
                  if (!t) {
                    return <div className={styles.stWordHint}>Toque numa palavra acima.</div>;
                  }
                  const lex = t.strong ? original.lex[t.strong] : undefined;
                  const morph = decodeMorph(t.morph, original.lang);
                  const meaning = lex?.definition || lex?.gloss || t.gloss || "";
                  return (
                    <div className={styles.stWordCard}>
                      <div className={styles.stWordHead}>
                        <span className={styles.stWordSurface} lang={original.lang === "hbo" ? "he" : "el"}>{t.surface}</span>
                        {t.translit ? <span className={styles.stWordTranslit}>{t.translit}</span> : null}
                      </div>
                      <dl className={styles.stWordDl}>
                        {t.lemma ? (<><dt>Lema</dt><dd lang={original.lang === "hbo" ? "he" : "el"}>{t.lemma}</dd></>) : null}
                        {t.strong ? (<><dt>Strong</dt><dd>{t.strong}</dd></>) : null}
                        {meaning ? (<><dt>Significado</dt><dd>{meaning}</dd></>) : null}
                        {morph ? (<><dt>Morfologia</dt><dd>{morph}{morph !== (t.morph || "") ? <span className="muted"> · {t.morph}</span> : null}</dd></>) : null}
                      </dl>
                    </div>
                  );
                })()}
              </>
            )}
            <div className={styles.stCredit}>Dados originais © STEPBible.org, CC BY 4.0.</div>
          </div>
        ) : tab === "refs" ? (
          <div className={styles.stRefs}>
            {related.status === "loading" ? (
              <div className="muted">Buscando textos relacionados…</div>
            ) : related.status === "error" ? (
              <div className="muted">Não foi possível carregar as referências agora.</div>
            ) : related.items.length === 0 ? (
              <div className={styles.stPh}>
                <div className={styles.stPhTitle}>Nenhum texto relacionado</div>
                <div className="muted" style={{ maxWidth: 380 }}>
                  Não encontramos referências cruzadas para <b>{refLabel}</b>. Tente abrir um versículo específico do capítulo.
                </div>
              </div>
            ) : (
              <>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Passagens que conversam com <b>{refLabel}</b>
                </div>
                <div className={styles.stRelChips}>
                  {related.items.map((rr) => (
                    <button key={rr.label} type="button" className={styles.stRelChip} onClick={() => openRelated(rr)}>
                      {rr.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className={styles.stCredit}>
              Referências cruzadas: Treasury of Scripture Knowledge via{" "}
              <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noreferrer">openbible.info</a> (CC BY).
            </div>
          </div>
        ) : tab !== "trans" ? (
          <div className={styles.stPh}>
            <div className={styles.stPhTitle}>{PLACEHOLDERS[tab].title}</div>
            <div className="muted" style={{ maxWidth: 380 }}>{PLACEHOLDERS[tab].desc}</div>
            <span className={styles.stSoon}>Em breve</span>
          </div>
        ) : (
          <>
            <div className={styles.cmpVers}>
              {!translations ? (
                <span className="muted">Carregando versões…</span>
              ) : versionsForLang.length === 0 ? (
                <span className="muted">Sem versões de domínio público nesta língua.</span>
              ) : (
                <>
                  {[...primary, ...(showMore ? extra : extra.filter((t) => picks.includes(t.id)))].map((t) => (
                    <span key={t.id} className={`${styles.cmpVer}${picks.includes(t.id) ? " " + styles.on : ""}`}>
                      <label className={styles.cmpVerLbl}>
                        <input type="checkbox" checked={picks.includes(t.id)} onChange={() => togglePick(t.id)} />
                        {" "}
                        {t.name || t.shortName || t.id}
                        {t.shortName ? ` (${t.shortName})` : ""}
                      </label>
                      <button
                        type="button"
                        className={`${styles.cmpStar}${favs.includes(t.id) ? " " + styles.on : ""}`}
                        aria-label={favs.includes(t.id) ? "Desfavoritar versão" : "Favoritar versão"}
                        aria-pressed={favs.includes(t.id)}
                        title={favs.includes(t.id) ? "Versão favorita" : "Favoritar versão"}
                        onClick={() => toggleFav(t.id)}
                      >
                        {favs.includes(t.id) ? "★" : "☆"}
                      </button>
                    </span>
                  ))}
                  {extra.length ? (
                    <button type="button" className={styles.cmpMore} onClick={() => setShowMore((v) => !v)}>
                      {showMore ? "Menos versões" : `Mais versões (${extra.length})`}
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {okPicks.length >= 2 ? (
              <label className={styles.cmpDiffToggle}>
                <input type="checkbox" checked={diffOn} onChange={(e) => setDiffOn(e.target.checked)} />
                <span>Destacar diferenças entre as versões</span>
              </label>
            ) : null}

            {picks.length === 0 ? (
              <div className="empty">Escolha ao menos uma versão.</div>
            ) : (
              <div className={styles.cmpCols} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {picks.map((id) => {
                  const res = results[id];
                  return (
                    <div key={id} className={styles.cmpCol}>
                      <div className={styles.cmpColh}>{labelFor(id)}</div>
                      {!res || res.status === "loading" ? (
                        <div className="muted">Carregando…</div>
                      ) : res.status === "error" ? (
                        <div className="muted">{res.error || "Não foi possível carregar."}</div>
                      ) : (
                        <>
                          <div className={styles.cmpText}>{res.verses.map((v) => renderVerse(v))}</div>
                          <div className={styles.cmpActions}>
                            <button className="link" type="button" onClick={() => void navigator.clipboard?.writeText(blockFor(id))}>Copiar</button>
                            {onAddToSermon ? (
                              <button className="link" type="button" onClick={() => { onAddToSermon(blockFor(id)); onClose(); }}>Adicionar ao sermão</button>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
