"use client";

// Aba "Palavra": Definição (português quando houver, senão o verbete inglês resumido)
// e Ocorrências (livro → capítulos → toque navega). Leitura direta das tabelas globais.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { glossOf, groupOccurrences, isHebrew, type ChapterRef, type LexShort, type OccBook } from "../../reader";
import styles from "./reader.module.css";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ok"; data: T };
const EN_MAX = 700;

export function WordTab({ strong, lex, onGo }: { strong: string; lex: Record<string, LexShort>; onGo: (r: ChapterRef) => void }) {
  const l = lex[strong];
  const heb = isHebrew(strong);
  const [seg, setSeg] = useState<"def" | "occ">("def");
  const [def, setDef] = useState<Load<{ pt: string | null; en: string | null }>>({ status: "loading" });
  const [occ, setOcc] = useState<Load<OccBook[]> | null>(null);
  const [openBook, setOpenBook] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void createClient()
      .from("strongs_lexicon")
      .select("definition_pt, definition")
      .eq("strong", strong)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        setDef(error ? { status: "error" } : { status: "ok", data: { pt: data?.definition_pt ?? null, en: data?.definition ?? null } });
      });
    return () => {
      alive = false;
    };
  }, [strong]);

  // Busca uma vez por palavra, quando a aba Ocorrências abre. `occ` fica FORA das
  // dependências: o "carregando" re-rodaria o efeito e o cleanup descartaria a resposta.
  const needOcc = seg === "occ" && occ == null;
  useEffect(() => {
    if (!needOcc) return;
    let alive = true;
    setOcc({ status: "loading" });
    void createClient()
      .rpc("strong_occurrences", { p_strong: strong })
      .then(({ data, error }) => {
        if (!alive) return;
        setOcc(error ? { status: "error" } : { status: "ok", data: groupOccurrences(data ?? []) });
      });
    return () => {
      alive = false;
    };
  }, [needOcc, strong]);

  const total = occ?.status === "ok" ? occ.data.reduce((s, b) => s + b.total, 0) : null;
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
    <div data-testid="word-tab">
      <div style={{ fontFamily: "Georgia, serif", fontSize: 26 }} lang={heb ? "he" : "grc"} dir={heb ? "rtl" : undefined}>{l?.lemma ?? strong}</div>
      <div className={styles.muted}>{[l?.translit, glossOf(l), strong].filter(Boolean).join(" · ")}</div>
      <div className={styles.seg} role="tablist">
        <button type="button" role="tab" aria-selected={seg === "def"} className={seg === "def" ? styles.segOn : undefined} onClick={() => setSeg("def")}>Definição</button>
        <button type="button" role="tab" aria-selected={seg === "occ"} className={seg === "occ" ? styles.segOn : undefined} onClick={() => setSeg("occ")}>
          Ocorrências{total != null ? ` ${total}` : ""}
        </button>
      </div>

      {seg === "def" ? (
        def.status === "loading" ? <p className={styles.muted}>Carregando…</p>
        : def.status === "error" ? <p className={styles.muted}>Não consegui carregar a definição agora.</p>
        : (
          <>
            {def.data.pt ? <p>{def.data.pt}</p> : def.data.en ? (
              <p><span className={styles.muted}>(verbete em inglês) </span>{def.data.en.length > EN_MAX ? def.data.en.slice(0, EN_MAX) + "…" : def.data.en}</p>
            ) : <p className={styles.muted}>Sem definição cadastrada.</p>}
            <p className={styles.muted}>
              Fonte: léxico STEPBible (CC BY 4.0){def.data.pt ? ", tradução Tally" : ""} ·{" "}
              <button type="button" className="link" onClick={copyCitation}>{copied ? "Citação copiada" : "Citar"}</button>
            </p>
          </>
        )
      ) : occ == null || occ.status === "loading" ? <p className={styles.muted}>Carregando…</p>
      : occ.status === "error" ? <p className={styles.muted}>Não consegui carregar as ocorrências agora.</p>
      : (
        <div>
          {occ.data.map((b) => (
            <div key={b.book}>
              <button type="button" className={styles.occBook} aria-expanded={openBook === b.book} onClick={() => setOpenBook((o) => (o === b.book ? "" : b.book))}>
                <span>{openBook === b.book ? "▾" : "›"} {b.name}</span><span className={styles.muted}>{b.total}</span>
              </button>
              {openBook === b.book ? (
                <div className={styles.occChaps}>
                  {b.chapters.map((c) => (
                    <button key={c.chapter} type="button" onClick={() => onGo({ book: b.book, chapter: c.chapter })}>
                      Capítulo {c.chapter}<br /><span className={styles.muted}>{c.n} {c.n === 1 ? "ocorrência" : "ocorrências"}</span>
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
