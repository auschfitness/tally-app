"use client";

// Aba "Comentário" (Frente C, spec 09): exibe comentários bíblicos de João
// (Jamieson-Fausset-Brown em domínio público e Tyndale sob CC BY-SA 4.0).
import { useEffect, useState } from "react";
import { chapterLabel, type ChapterRef } from "../../reader";
import { listCommentariesAction } from "../../actions";
import type { BibleCommentaryItem } from "../../reader-queries";
import styles from "./reader.module.css";

export function CommentaryTab({
  refNow,
  verse,
}: {
  refNow: ChapterRef;
  verse: number | null;
}) {
  const isJohn = refNow.book === "JHN" || refNow.book === "John";
  const [items, setItems] = useState<BibleCommentaryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isJohn) {
      setItems([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setErr("");
    void listCommentariesAction("John", refNow.chapter).then((r) => {
      if (!alive) return;
      setLoading(false);
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
      <div data-testid="commentary-tab">
        <div className={styles.eyebrow}>{chapterLabel(refNow)} · Comentários</div>
        <p className={styles.muted} style={{ fontSize: "14px", lineHeight: "1.6" }}>
          Por enquanto os comentários bíblicos estão disponíveis apenas no Evangelho de João.
        </p>
      </div>
    );
  }

  // Filtragem por versículo
  let displayed: BibleCommentaryItem[] = [];
  let isNearest = false;
  let nearestVerse: number | null = null;

  if (items && items.length > 0) {
    if (verse != null) {
      const exact = items.filter((c) => c.verse_start <= verse && c.verse_end >= verse);
      if (exact.length > 0) {
        displayed = exact;
      } else {
        // Encontra o versículo com comentário mais próximo daquele solicitado
        let minDiff = Infinity;
        for (const c of items) {
          const diff = Math.abs(c.verse_start - verse);
          if (diff < minDiff) {
            minDiff = diff;
            nearestVerse = c.verse_start;
          }
        }
        if (nearestVerse != null) {
          displayed = items.filter((c) => c.verse_start === nearestVerse);
          isNearest = true;
        }
      }
    } else {
      // Nenhum versículo específico selecionado: exibe a introdução / primeiros comentários
      displayed = items.slice(0, 4);
    }
  }

  const where = verse ? `${chapterLabel(refNow)}:${verse}` : chapterLabel(refNow);

  return (
    <div data-testid="commentary-tab">
      <div className={styles.eyebrow}>{where} · Comentários</div>

      {loading ? (
        <p className={styles.muted}>Carregando comentários…</p>
      ) : err ? (
        <p className={styles.muted}>{err}</p>
      ) : items == null || items.length === 0 ? (
        <p className={styles.muted}>Nenhum comentário encontrado neste capítulo.</p>
      ) : (
        <>
          {isNearest && verse != null ? (
            <div
              style={{
                padding: "8px 12px",
                marginBottom: "16px",
                borderRadius: "var(--r-6)",
                background: "var(--surface-2)",
                fontSize: "13px",
                color: "var(--text-2)",
              }}
            >
              Não há comentário específico para o versículo {verse}. Exibindo o comentário mais próximo (versículo {nearestVerse}):
            </div>
          ) : null}

          {displayed.map((c) => {
            const isTyndale = c.source === "tyndale";
            const sourceLabel = isTyndale ? "Comentário Tyndale" : "Jamieson-Fausset-Brown";
            const badgeLabel = isTyndale ? "CC BY-SA 4.0" : "Domínio público";
            const vLabel = c.kind === "intro"
              ? "Introdução do capítulo"
              : c.verse_start === c.verse_end
                ? `Versículo ${c.verse_start}`
                : `Versículos ${c.verse_start}-${c.verse_end}`;

            return (
              <article key={c.id} className={styles.commentaryCard} data-testid="commentary-card">
                <div className={styles.commentaryHeader}>
                  <div>
                    <h3 className={styles.commentaryAuthor}>{sourceLabel}</h3>
                    <span className={styles.muted} style={{ fontSize: "12px" }}>{vLabel}</span>
                  </div>
                  <span className={styles.commentaryBadge}>{badgeLabel}</span>
                </div>

                <div className={styles.commentaryText}>
                  {c.text_pt}
                </div>

                <footer className={styles.commentaryFooter}>
                  {isTyndale ? (
                    <span>Fonte: Tyndale Bible Commentary · Licença Creative Commons CC BY-SA 4.0</span>
                  ) : (
                    <span>Jamieson-Fausset-Brown Bible Commentary (1871) · Domínio público</span>
                  )}
                </footer>
              </article>
            );
          })}
        </>
      )}
    </div>
  );
}
