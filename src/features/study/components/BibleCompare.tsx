"use client";

// Comparar Bíblia — buscar/ler/comparar passagens em versões de domínio público,
// lado a lado. Restaura a integração bíblica do app legado (regressão da migração
// Next). Texto vem da Free Use Bible API (helloao, client-side); nada no nosso banco.
// Gate de licença: só versões que temos direito de exibir — o catálogo helloao é de
// uso livre/comercial, então todas passam (ponto único onde uma fonte licenciada
// futura, ESV/NIV, seria barrada). Interlinear grego/hebraico segue ADIADO.
import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/shared/Select";
import { BOOKS, bookName } from "@/lib/bible/books";
import { fetchPassage, listTranslations, type PassageVerse, type Translation } from "@/lib/bible/source";
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

interface CmpRef {
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
}
type ColResult =
  | { status: "loading" }
  | { status: "error"; error?: string }
  | { status: "ok"; verses: PassageVerse[] };

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

  useEffect(() => {
    let alive = true;
    listTranslations()
      .then((list) => alive && setTranslations(list))
      .catch(() => alive && setTranslations([]));
    return () => {
      alive = false;
    };
  }, []);

  const versionsForLang = useMemo(
    () => (translations ?? []).filter((t) => (t.language || "").toLowerCase() === lang),
    [translations, lang],
  );

  // Poucas versões por padrão (curadas); o resto atrás de "Mais versões". Se nenhuma
  // versão casar a curadoria nesta língua, mostra as 3 primeiras como fallback (nunca
  // um padrão vazio).
  const { primary, extra } = useMemo(() => {
    const cur = versionsForLang.filter((t) => isCurated(t, lang));
    if (cur.length) return { primary: cur, extra: versionsForLang.filter((t) => !isCurated(t, lang)) };
    return { primary: versionsForLang.slice(0, 3), extra: versionsForLang.slice(3) };
  }, [versionsForLang, lang]);

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

  // Ao carregar as versões: seleciona as 2 primeiras curadas e busca.
  useEffect(() => {
    if (!translations) return;
    const def = primary.slice(0, 2).map((t) => t.id);
    setPicks(def);
    runFor(def, ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translations, lang]);

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
  function compareNow() {
    runFor(picks, applyInputs());
  }
  function wholeChapter() {
    const r: CmpRef = { ...ref, chapter: parseInt(chapStr, 10) || ref.chapter, verse_start: null, verse_end: null };
    setRef(r);
    setVsStr("");
    setVeStr("");
    runFor(picks, r);
  }
  function togglePick(id: string) {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      runFor([id], ref);
      return [...prev, id];
    });
  }

  const refLabel =
    bookName(ref.book) +
    " " +
    ref.chapter +
    (ref.verse_start ? ":" + ref.verse_start + (ref.verse_end && ref.verse_end !== ref.verse_start ? "-" + ref.verse_end : "") : "");

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

  const cols = Math.min(picks.length, 3);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`modal ${styles.cmp}`} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.cmpHead}>
          <h3>Comparar Bíblia</h3>
          <button className="iconbtn" type="button" aria-label="Fechar" style={{ marginLeft: "auto" }} onClick={onClose}>×</button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Versões de domínio público. Passagem: <b>{refLabel}</b>
        </div>

        <div className={styles.cmpSel}>
          <Select value={ref.book} compact onChange={(e) => setRef((r) => ({ ...r, book: e.target.value }))}>
            {BOOKS.map((b) => <option key={b.code} value={b.code}>{b.pt}</option>)}
          </Select>
          <input type="number" min={1} placeholder="cap" value={chapStr} onChange={(e) => setChapStr(e.target.value)} style={{ width: 62 }} />
          <input type="number" min={1} placeholder="v. ini" value={vsStr} onChange={(e) => setVsStr(e.target.value)} style={{ width: 62 }} />
          <input type="number" min={1} placeholder="v. fim" value={veStr} onChange={(e) => setVeStr(e.target.value)} style={{ width: 62 }} />
          <button className="btn" type="button" onClick={compareNow}>Comparar</button>
          <button className="link" type="button" onClick={wholeChapter}>Capítulo inteiro</button>
        </div>

        <div className={styles.cmpVers}>
          {!translations ? (
            <span className="muted">Carregando versões…</span>
          ) : versionsForLang.length === 0 ? (
            <span className="muted">Sem versões de domínio público nesta língua.</span>
          ) : (
            <>
              {[...primary, ...(showMore ? extra : extra.filter((t) => picks.includes(t.id)))].map((t) => (
                <label key={t.id} className={`${styles.cmpVer}${picks.includes(t.id) ? " " + styles.on : ""}`}>
                  <input type="checkbox" checked={picks.includes(t.id)} onChange={() => togglePick(t.id)} />
                  {" "}
                  {t.name || t.shortName || t.id}
                  {t.shortName ? ` (${t.shortName})` : ""}
                </label>
              ))}
              {extra.length ? (
                <button type="button" className={styles.cmpMore} onClick={() => setShowMore((v) => !v)}>
                  {showMore ? "Menos versões" : `Mais versões (${extra.length})`}
                </button>
              ) : null}
            </>
          )}
        </div>

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
                      <div className={styles.cmpText}>
                        {res.verses.map((v) => (
                          <span key={v.n}><sup style={{ color: "var(--text-2)", marginRight: 3 }}>{v.n}</sup>{v.text} </span>
                        ))}
                      </div>
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
      </form>
    </div>
  );
}
