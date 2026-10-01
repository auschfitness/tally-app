"use client";

// Aba "Palavra" (uma só; tocar outra palavra troca o conteúdo). Cabeçalho com a forma
// DESTE versículo no original, a palavra em português tocada e o Strong; Definição
// (glosa grande, definição, forma de dicionário, gramática desta ocorrência em
// português) e Ocorrências (distribuição por livro → capítulos → toque navega).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { morphPt } from "../../morph";
import { chapterLabel, glossOf, filterOccurrences, groupOccurrences, isHebrew, strongNum, type ChapterRef, type LexShort, type OccBook, type WordPick, withChapterCount } from "../../reader";
import { selectHit } from "./ReaderWorkspace";
import styles from "./reader.module.css";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ok"; data: T };
const EN_MAX = 700;

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

  async function copyCitation(): Promise<void> {
    try {
      await navigator.clipboard.writeText(citation);
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
          {gloss ? <h3 className={styles.wGloss}>{gloss}</h3> : null}
          {def.status === "loading" ? <p className={styles.muted}>Carregando…</p>
          : def.status === "error" ? <p className={styles.muted}>Não consegui carregar a definição agora.</p>
          : def.data.pt ? <p className={styles.wDef}>{def.data.pt}</p>
          : def.data.en ? (
            <p className={styles.wDef}><span className={styles.muted}>(verbete em inglês) </span>{def.data.en.length > EN_MAX ? def.data.en.slice(0, EN_MAX) + "…" : def.data.en}</p>
          ) : <p className={styles.muted}>Sem definição cadastrada.</p>}

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

          <p className={styles.source}>
            Fonte: léxico STEPBible (CC BY 4.0){def.status === "ok" && def.data.pt ? ", tradução Tally" : ""} ·{" "}
            <button type="button" className="link" onClick={copyCitation}>{copied ? "Citação copiada" : "Citar"}</button>
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
                <button type="button" aria-label="Ocorrência anterior" disabled={at <= 0} onClick={() => selectHit(hits[at - 1] ?? "", "center")}>‹</button>
                <button type="button" aria-label="Próxima ocorrência" disabled={at >= hits.length - 1} onClick={() => selectHit(hits[at + 1] ?? "", "center")}>›</button>
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
                <span className={styles.occChev} aria-hidden>›</span>
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
