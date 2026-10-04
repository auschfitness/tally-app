"use client";

// Aba "Palavra" (uma só; tocar outra palavra troca o conteúdo). Cabeçalho com a forma
// DESTE versículo no original, a palavra em português tocada e o Strong; Definição
// (glosa grande, definição, forma de dicionário, gramática desta ocorrência em
// português) e Ocorrências (distribuição por livro → capítulos → toque navega).
// Com verbete no dicionário UBS (spec 09), a Definição mostra o sentido deste versículo
// (glosas, definição, comentário, domínios, versículo citado) e os outros sentidos; sem
// verbete, cai no léxico STEPBible.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { morphPt } from "../../morph";
import { usfmToOsis } from "@/lib/bible/osis";
import { chapterLabel, glossOf, filterOccurrences, groupOccurrences, isHebrew, orderSenses, strongNum, ubsCitation, type ChapterRef, type LexShort, type OccBook, type UbsSense, type WordPick, withChapterCount } from "../../reader";
import { selectHit } from "./ReaderWorkspace";
import { UiIcon } from "@/components/shared/UiIcon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./reader.module.css";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ok"; data: T };
const EN_MAX = 700;
const CITE_ON = false;

export function WordTab({
  pick,
  lex,
  hits,
  refNow,
  activeKey,
  onGo,
  onNote,
  onSermon,
}: {
  pick: WordPick;
  lex: Record<string, LexShort>;
  hits: string[];
  refNow: ChapterRef;
  activeKey: string | null;
  onGo: (r: ChapterRef) => void;
  onNote: () => void;
  onSermon?: () => void;
}) {
  const { strong } = pick;
  const l = lex[strong];
  const heb = isHebrew(strong);
  const lang = heb ? "he" : "grc";
  const dir = heb ? "rtl" : undefined;
  const [seg, setSeg] = useState<"def" | "occ">("def");
  const [def, setDef] = useState<Load<{ pt: string | null; en: string | null }>>({ status: "loading" });
  const [freq, setFreq] = useState<number | null>(null);
  const [occ, setOcc] = useState<Load<OccBook[]> | null>(null);
  const [openBook, setOpenBook] = useState("");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [ubs, setUbs] = useState<Load<(UbsSense & { here: boolean })[]>>({ status: "loading" });
  const osis = usfmToOsis(pick.book);
  const verseRef = osis ? `${osis}.${pick.chapter}.${pick.verse}` : "";

  // Outra palavra: zera o que é desta (a aba é a mesma, o componente não remonta).
  useEffect(() => {
    setDef({ status: "loading" });
    setFreq(null);
    setOcc(null);
    setOpenBook("");
    setQuery("");
    setCopied(false);
    let alive = true;
    const db = createClient();
    void db.from("strongs_lexicon").select("definition_pt, definition").eq("strong", strong).maybeSingle().then(({ data, error }) => {
      if (alive) setDef(error ? { status: "error" } : { status: "ok", data: { pt: data?.definition_pt ?? null, en: data?.definition ?? null } });
    });
    void db.from("strong_frequency").select("occurrences").eq("strong", strong).maybeSingle().then(({ data }) => {
      if (alive) setFreq(data?.occurrences ?? null);
    });
    return () => {
      alive = false;
    };
  }, [strong]);

  // Sentidos UBS do verbete + quais a UBS marca para ESTE versículo (refs fica no banco:
  // palavras comuns têm milhares de versículos).
  useEffect(() => {
    let alive = true;
    setUbs({ status: "loading" });
    const db = createClient();
    void Promise.all([
      db.from("ubs_senses").select("sense_id, lemma, entry_code, ord, glosses, definition, comments, domains, subdomains").eq("strong", strong),
      verseRef ? db.from("ubs_senses").select("sense_id").eq("strong", strong).contains("refs", [verseRef]) : Promise.resolve({ data: [], error: null }),
    ]).then(([all, hereRows]) => {
      if (!alive) return;
      if (all.error) setUbs({ status: "error" });
      else setUbs({ status: "ok", data: orderSenses(all.data ?? [], (hereRows.data ?? []).map((h) => h.sense_id)) });
    });
    return () => {
      alive = false;
    };
  }, [strong, verseRef]);

  // Busca uma vez por palavra, quando a aba Ocorrências abre. Sem cleanup que descarte a
  // resposta: o próprio "carregando" muda as dependências e mataria a requisição. Quem
  // protege de resposta atrasada é a conferência com a palavra atual (`current`).
  const current = useRef(strong);
  current.current = strong;
  useEffect(() => {
    if (seg !== "occ" || occ != null) return;
    setOcc({ status: "loading" });
    const asked = strong;
    void createClient()
      .rpc("strong_occurrences", { p_strong: asked })
      .then(({ data, error }) => {
        if (current.current !== asked) return;
        setOcc(error ? { status: "error" } : { status: "ok", data: groupOccurrences(data ?? []) });
      });
  }, [seg, occ, strong]);

  const total = occ?.status === "ok" ? occ.data.reduce((s, b) => s + b.total, 0) : freq;
  const books = occ?.status === "ok" ? withChapterCount(occ.data, refNow, hits.length) : [];
  const maxBook = Math.max(1, ...books.map((b) => b.total));
  const shown = filterOccurrences(books, query);
  const byChapter = /\d/.test(query); // com número, os capítulos que casam já aparecem abertos
  const at = activeKey ? hits.indexOf(activeKey) : -1;
  const gloss = glossOf(l);
  const grammar = morphPt(pick.morph);
  const here = `${chapterLabel(pick)}:${pick.verse}`;
  const citation = `STEPBible, léxico ${heb ? "hebraico" : "grego"} (CC BY 4.0), verbete ${strong}${def.status === "ok" && def.data.pt ? ", tradução Tally" : ""}.`;

  const senses = ubs.status === "ok" ? ubs.data : [];
  const main = senses[0];

  async function copyCitation(): Promise<void> {
    try {
      await navigator.clipboard.writeText(main ? ubsCitation(main.lemma, main.entry_code, new Date()) : citation);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div data-testid="word-tab" className={styles.wt}>
      <header className={styles.wHead} key={pick.key}>
        <div className={styles.wSurface} lang={lang} dir={dir}>{pick.surface || l?.lemma || strong}</div>
        <div className={styles.wMeta}>
          {pick.translit || l?.translit ? <span className={styles.wTr}>{pick.translit || l?.translit}</span> : null}
          {pick.text ? <span className={styles.wPt}>{pick.text}</span> : null}
          <span className={styles.badge} title={`Strong ${strong}`}>{strongNum(strong)}</span>
        </div>
        <div className={styles.wActions}>
          <button type="button" className={styles.chip} onClick={onNote}>Anotar {here}</button>
          {onSermon ? <button type="button" className={styles.chip} onClick={onSermon}>Levar pro sermão</button> : null}
        </div>
      </header>

      <div className={styles.under} role="tablist">
        <button type="button" role="tab" aria-selected={seg === "def"} className={seg === "def" ? styles.underOn : undefined} onClick={() => setSeg("def")}>Definição</button>
        <button type="button" role="tab" aria-selected={seg === "occ"} className={seg === "occ" ? styles.underOn : undefined} onClick={() => setSeg("occ")}>
          Ocorrências{total != null ? <span className={styles.count}>{total}</span> : null}
        </button>
      </div>

      {seg === "def" ? (
        <div className={styles.wBody}>
          {ubs.status === "loading" ? <p className={styles.muted}>Carregando…</p>
          : main ? (
            <>
              {senses.length > 1 ? <p className={styles.senseTag}>{main.here ? "Sentido neste versículo" : "Sentido principal"}</p> : null}
              <SenseBody s={main} gloss={gloss} />
              {pick.quote ? (
                <blockquote className={styles.wQuote}>
                  {pick.quote.before}<mark>{pick.quote.word}</mark>{pick.quote.after}
                  <cite> · {here}</cite>
                </blockquote>
              ) : null}
              {senses.length > 1 ? (
                <div className={styles.senses}>
                  <p className={styles.senseTag}>Outros sentidos</p>
                  {senses.slice(1).map((s, n) => (
                    <details key={s.sense_id} className={styles.sense}>
                      <summary><span className={styles.senseN}>{n + 2}</span>{s.glosses.join(", ") || formatDefinition(s.definition)}</summary>
                      <SenseBody s={s} />
                    </details>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          {ubs.status === "loading" || main ? null : (
            <>
              {gloss ? <h3 className={styles.wGloss}>{gloss}</h3> : null}
              {def.status === "loading" ? <p className={styles.muted}>Carregando…</p>
              : def.status === "error" ? <p className={styles.muted}>Não consegui carregar a definição agora.</p>
              : def.data.pt ? <p className={styles.wDef}>{formatDefinition(def.data.pt)}</p>
              : def.data.en ? (
                <p className={styles.wDef}><span className={styles.muted}>(verbete em inglês) </span>{formatDefinition(def.data.en.length > EN_MAX ? def.data.en.slice(0, EN_MAX) + "…" : def.data.en)}</p>
              ) : <p className={styles.muted}>Sem definição cadastrada.</p>}
              {pick.quote ? (
                <blockquote className={styles.wQuote}>
                  {pick.quote.before}<mark>{pick.quote.word}</mark>{pick.quote.after}
                  <cite> · {here}</cite>
                </blockquote>
              ) : null}
            </>
          )}

          <dl className={styles.facts}>
            {l?.lemma ? (
              <>
                <dt>Forma de dicionário</dt>
                <dd><span className={styles.factGreek} lang={lang} dir={dir}>{l.lemma}</span></dd>
              </>
            ) : null}
            {grammar ? (
              <>
                <dt>Nesta ocorrência · {here}</dt>
                <dd>{grammar}</dd>
              </>
            ) : null}
            {freq != null ? (
              <>
                <dt>Frequência</dt>
                <dd>{freq} {freq === 1 ? "vez" : "vezes"} {heb ? "no Antigo Testamento" : "no Novo Testamento"}</dd>
              </>
            ) : null}
          </dl>

          {/* "Citar" desligado até o app ter domínio próprio (pedido do dono, 2026-10-01): a
              citação precisa apontar para o endereço do versículo. Ver backlog do Estudo. */}
          <p className={styles.source}>
            {main ? "Fonte: Dicionário Grego do Novo Testamento da UBS (CC BY-SA 4.0), tradução Tally" : `Fonte: léxico STEPBible (CC BY 4.0)${def.status === "ok" && def.data.pt ? ", tradução Tally" : ""}`}
            {CITE_ON ? <>{" · "}<button type="button" className="link" onClick={copyCitation}>{copied ? "Citação copiada" : main ? "Citar (ABNT)" : "Citar"}</button></> : null}
          </p>
        </div>
      ) : occ == null || occ.status === "loading" ? <p className={styles.muted}>Carregando…</p>
      : occ.status === "error" ? <p className={styles.muted}>Não consegui carregar as ocorrências agora.</p>
      : (
        <div className={styles.wBody}>
          {hits.length ? (
            <div className={styles.here}>
              <span>{at >= 0 ? <><b>{at + 1}</b> de {hits.length}</> : hits.length} neste capítulo</span>
              <span className={styles.stepper}>
                <button type="button" aria-label="Ocorrência anterior" disabled={at <= 0} onClick={() => selectHit(hits[at - 1] ?? "", "center")}><UiIcon icon={ChevronLeft} /></button>
                <button type="button" aria-label="Próxima ocorrência" disabled={at >= hits.length - 1} onClick={() => selectHit(hits[at + 1] ?? "", "center")}><UiIcon icon={ChevronRight} /></button>
              </span>
            </div>
          ) : null}
          <input
            type="search"
            className={styles.occFilter}
            aria-label="Filtrar por livro ou capítulo"
            placeholder="Filtrar por livro ou capítulo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && shown.length === 0 ? <p className={styles.muted}>Nenhuma ocorrência em “{query.trim()}”.</p> : null}
          {shown.map((b) => (
            <div key={b.book}>
              <button type="button" className={styles.occBook} aria-expanded={byChapter || openBook === b.book} onClick={() => setOpenBook((o) => (o === b.book ? "" : b.book))}>
                <UiIcon icon={ChevronRight} className={styles.occChev} />
                <span className={styles.occName}>{b.name}</span>
                <span className={styles.occBar} aria-hidden><i style={{ transform: `scaleX(${b.total / maxBook})` }} /></span>
                <span className={styles.occN}>{b.total}</span>
              </button>
              {byChapter || openBook === b.book ? (
                <div className={styles.occChaps}>
                  {b.chapters.map((c) => (
                    <button key={c.chapter} type="button" onClick={() => onGo({ book: b.book, chapter: c.chapter })}>
                      <b>Capítulo {c.chapter}</b>
                      <span>{c.n} {c.n === 1 ? "ocorrência" : "ocorrências"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDefinition(raw: string | null | undefined): string {
  if (!raw) return "";
  let str = raw.trim();
  if (!str) return "";
  str = str.charAt(0).toUpperCase() + str.slice(1);
  if (!/[.!?]$/.test(str)) {
    str += ".";
  }
  return str;
}

// Um sentido UBS: glosas como título (só no principal), definição, comentário em
// <details> "Ler nota do dicionário" (fechado por padrão) e domínios.
function SenseBody({ s, gloss }: { s: UbsSense; gloss?: string }): React.ReactElement {
  const title = s.glosses.join(", ") || gloss;
  const tags = [...s.domains, ...s.subdomains];
  const defFormatted = formatDefinition(s.definition);
  const comments = s.comments?.trim();

  return (
    <>
      {gloss !== undefined && title ? <h3 className={styles.wGloss}>{title}</h3> : null}
      {defFormatted ? <p className={styles.wDef}>{defFormatted}</p> : null}
      {comments ? (
        <details className={styles.wComments}>
          <summary>Ler nota do dicionário</summary>
          {comments.split(/\n\n+/).map((p, i) => (
            <p key={i} className={styles.wCmt}>{p}</p>
          ))}
        </details>
      ) : null}
      {tags.length ? (
        <div className={styles.tags}>
          {tags.map((t, i) => <span key={i} className={styles.tag}>{t}</span>)}
        </div>
      ) : null}
    </>
  );
}
