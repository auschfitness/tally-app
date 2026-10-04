"use client";

// Aba "Comentário" (Frente C, spec 09): comentários de João (Jamieson-Fausset-Brown,
// domínio público; Tyndale, CC BY-SA 4.0). Segue o versículo selecionado no texto e
// mostra uma fonte por vez. Sem animação: troca de versículo e de fonte é frequente.
import { useEffect, useState } from "react";
import { bookName, chapterLabel, type ChapterRef } from "../../reader";
import { listCommentariesAction } from "../../actions";
import type { BibleCommentaryItem } from "../../reader-queries";
import { CMT_CREDIT, CMT_NAME, CMT_SOURCES, pickCommentary, type CmtSource } from "../../commentary";
import styles from "./reader.module.css";

const SOURCE_KEY = "tally.reader.commentarySource";

export function CommentaryTab({ refNow, verse }: { refNow: ChapterRef; verse: number | null }) {
  const isJohn = refNow.book === "JHN" || refNow.book === "John";
  const [items, setItems] = useState<BibleCommentaryItem[] | null>(null);
  const [err, setErr] = useState("");
  const [source, setSource] = useState<CmtSource>("jfb");

  useEffect(() => {
    try {
      const v = localStorage.getItem(SOURCE_KEY);
      if (v === "jfb" || v === "tyndale") setSource(v);
    } catch {
      /* sem armazenamento: JFB */
    }
  }, []);
  function choose(s: CmtSource): void {
    setSource(s);
    try {
      localStorage.setItem(SOURCE_KEY, s);
    } catch {
      /* escolha só nesta visita */
    }
  }

  useEffect(() => {
    if (!isJohn) return;
    let alive = true;
    setItems(null);
    setErr("");
    void listCommentariesAction("John", refNow.chapter).then((r) => {
      if (!alive) return;
      if (r.success) setItems(r.data);
      else {
        setItems([]);
        setErr(r.message || "Não consegui carregar os comentários.");
      }
    });
    return () => {
      alive = false;
    };
  }, [isJohn, refNow.chapter]);

  if (!isJohn) {
    return (
      <div data-testid="commentary-tab" className={styles.cmt}>
        <h2 className={styles.cmtTitle}>Comentário de {chapterLabel(refNow)}</h2>
        <p className={styles.cmtNote}>Por enquanto os comentários estão disponíveis só no Evangelho de João.</p>
      </div>
    );
  }

  const other: CmtSource = source === "jfb" ? "tyndale" : "jfb";
  const view = items ? pickCommentary(items, source, verse, refNow.chapter) : null;
  const otherHas = items ? pickCommentary(items, other, verse, refNow.chapter) != null : false;
  const book = bookName(refNow.book);
  const title = view && verse != null
    ? `Comentário de ${book} ${refNow.chapter}:${view.start}${view.end > view.start ? `-${view.end}` : ""}`
    : verse != null
      ? `Comentário de ${book} ${refNow.chapter}:${verse}`
      : `Comentário de ${chapterLabel(refNow)}`;

  return (
    <div data-testid="commentary-tab" className={styles.cmt}>
      <div className={styles.cmtHead}>
        <h2 className={styles.cmtTitle}>{title}</h2>
        <div className={styles.seg} role="group" aria-label="Fonte do comentário">
          {CMT_SOURCES.map((s) => (
            <button key={s} type="button" aria-pressed={source === s} className={source === s ? styles.segOn : ""} onClick={() => choose(s)}>
              {CMT_NAME[s]}
            </button>
          ))}
        </div>
      </div>

      {items == null ? (
        <p className={styles.cmtNote}>Carregando…</p>
      ) : err ? (
        <p className={styles.cmtNote}>{err}</p>
      ) : (
        <>
          {view ? (
            <div className={styles.cmtBody} data-testid="commentary-body" data-source={source}>
              {view.blocks.map((b, i) =>
                b.type === "heading" ? (
                  <h3 key={i} className={styles.cmtSection}>
                    {b.title}
                    {b.ref ? <span className={styles.cmtRef}> · {b.ref}</span> : null}
                  </h3>
                ) : b.type === "label" ? (
                  <div key={i} className={styles.cmtLabel}>{b.text}</div>
                ) : (
                  <p key={i} className={styles.cmtPara}>
                    {b.lead ? <strong>{b.lead}</strong> : null}
                    {b.text}
                  </p>
                ),
              )}
            </div>
          ) : (
            <p className={styles.cmtNote} data-testid="commentary-missing">
              {verse == null
                ? `O ${CMT_NAME[source]} não tem introdução para este capítulo.`
                : `O ${CMT_NAME[source]} não comenta o versículo ${verse}.`}
              {otherHas ? (
                <>
                  {" "}
                  <button type="button" className={styles.cmtSwitch} onClick={() => choose(other)}>
                    Ver no {CMT_NAME[other]}
                  </button>
                </>
              ) : null}
            </p>
          )}

          {verse == null ? <p className={styles.cmtNote}>Toque num versículo para ver o comentário.</p> : null}
          {view ? <p className={styles.cmtCredit}>{CMT_CREDIT[source]}</p> : null}
        </>
      )}
    </div>
  );
}
