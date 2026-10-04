"use client";

// Aba "Comentário" (Frente C, spec 09): texto corrido do capítulo em João
// (Jamieson-Fausset-Brown, domínio público; Tyndale, CC BY-SA 4.0).
// Segue o versículo selecionado com rolagem e marcação lateral.
// Sem animação: trocas frequentes.
import { useEffect, useMemo, useRef, useState } from "react";
import { chapterLabel, type ChapterRef } from "../../reader";
import { listCommentariesAction } from "../../actions";
import type { BibleCommentaryItem } from "../../reader-queries";
import {
  CMT_CREDIT,
  CMT_NAME,
  CMT_SOURCES,
  chapterCommentary,
  type CmtBlock,
  type CmtSource,
} from "../../commentary";
import styles from "./reader.module.css";

const SOURCE_KEY = "tally.reader.commentarySource";

interface CmtChunkData {
  start: number;
  end: number;
  blocks: CmtBlock[];
}

export function CommentaryTab({ refNow, verse }: { refNow: ChapterRef; verse: number | null }) {
  const isJohn = refNow.book === "JHN" || refNow.book === "John";
  const [items, setItems] = useState<BibleCommentaryItem[] | null>(null);
  const [err, setErr] = useState("");
  const [source, setSource] = useState<CmtSource>("jfb");
  const tabRef = useRef<HTMLDivElement>(null);

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

  const chapterData = useMemo(() => {
    if (!items) return { chunks: [] };
    const { blocks } = chapterCommentary(items, source, refNow.chapter);
    const chunks: CmtChunkData[] = [];
    let cur: CmtChunkData | null = null;
    for (const b of blocks) {
      if (b.anchor) {
        cur = {
          start: b.anchor.start,
          end: b.anchor.end,
          blocks: [b],
        };
        chunks.push(cur);
      } else if (cur) {
        cur.blocks.push(b);
      } else {
        cur = {
          start: 1,
          end: 1,
          blocks: [b],
        };
        chunks.push(cur);
      }
    }
    return { chunks };
  }, [items, source, refNow.chapter]);

  const activeChunkIndex = useMemo(() => {
    if (verse == null) return -1;
    const { chunks } = chapterData;
    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i];
      if (c && c.start <= verse && c.end >= verse) {
        return i;
      }
    }
    return -1;
  }, [verse, chapterData]);

  useEffect(() => {
    if (!tabRef.current) return;
    const panel = tabRef.current.closest<HTMLElement>('[role="tabpanel"]') ?? tabRef.current;
    if (verse == null) {
      panel.scrollTop = 0;
      return;
    }
    if (activeChunkIndex < 0) return;
    const el = tabRef.current.querySelector<HTMLElement>(`[data-chunk-idx="${activeChunkIndex}"]`);
    if (el) {
      const panelRect = panel.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      panel.scrollTop += elRect.top - panelRect.top;
    }
  }, [verse, activeChunkIndex, source]);

  if (!isJohn) {
    return (
      <div ref={tabRef} data-testid="commentary-tab" className={styles.cmt}>
        <h2 className={styles.cmtTitle}>Comentário de {chapterLabel(refNow)}</h2>
        <p className={styles.cmtNote}>Por enquanto os comentários estão disponíveis só no Evangelho de João.</p>
      </div>
    );
  }

  const title = `Comentário de ${chapterLabel(refNow)}`;

  return (
    <div ref={tabRef} data-testid="commentary-tab" className={styles.cmt}>
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
          <div className={styles.cmtBody} data-testid="commentary-body" data-source={source}>
            {chapterData.chunks.map((chunk, idx) => {
              const isCurrent = idx === activeChunkIndex;
              const label = `Jo ${refNow.chapter}.${chunk.start}${chunk.end > chunk.start ? `-${chunk.end}` : ""}`;
              return (
                <div
                  key={idx}
                  data-chunk-idx={idx}
                  data-on={isCurrent ? "true" : undefined}
                  data-start={chunk.start}
                  data-end={chunk.end}
                  className={styles.cmtChunk}
                >
                  <div
                    id={`cmt-v${chunk.start}`}
                    className={styles.cmtLabel}
                    data-start={chunk.start}
                    data-end={chunk.end}
                  >
                    {label}
                  </div>
                  {chunk.blocks.map((b, bi) =>
                    b.type === "heading" ? (
                      <h3 key={bi} className={styles.cmtSection}>
                        {b.title}
                        {b.ref ? <span className={styles.cmtRef}> · {b.ref}</span> : null}
                      </h3>
                    ) : b.type === "label" ? (
                      <div key={bi} className={styles.cmtLabel}>{b.text}</div>
                    ) : (
                      <p key={bi} className={styles.cmtPara}>
                        {b.lead ? <strong>{b.lead}</strong> : null}
                        {b.text}
                      </p>
                    ),
                  )}
                </div>
              );
            })}
          </div>

          {chapterData.chunks.length > 0 ? (
            <p className={styles.cmtCredit}>{CMT_CREDIT[source]}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
