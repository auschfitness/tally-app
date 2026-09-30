"use client";

// Balão da palavra: ancorado no trecho tocado (origem do scale no canto do balão mais
// perto da palavra). Fecha com Esc, clique fora, rolagem ou ×.
import { useEffect, useRef } from "react";
import { glossOf, isHebrew, type LexShort } from "../../reader";
import styles from "./reader.module.css";

export interface PopoverState {
  strong: string;
  verse: number;
  key: string; // identifica o trecho tocado (para o realce)
  top: number;
  left: number;
}

const WIDTH = 264;

// Posição a partir do retângulo da palavra, sem vazar da janela.
export function popoverAt(rect: DOMRect, strong: string, verse: number, key: string): PopoverState {
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - WIDTH - 12);
  return { strong, verse, key, top: rect.bottom + 8, left };
}

export function WordPopover({
  state,
  lex,
  canSendToSermon,
  onDetails,
  onNote,
  onSermon,
  onClose,
}: {
  state: PopoverState;
  lex: Record<string, LexShort>;
  canSendToSermon: boolean;
  onDetails: () => void;
  onNote: () => void;
  onSermon: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const l = lex[state.strong];
  const heb = isHebrew(state.strong);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: PointerEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onClose, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onClose);
    };
  }, [onClose]);

  return (
    <div ref={ref} role="dialog" aria-label={`Palavra original ${l?.lemma ?? state.strong}`} className={styles.pop} style={{ top: state.top, left: state.left }} data-testid="word-popover">
      <div className={styles.popHead}>
        <span className={styles.popLemma} lang={heb ? "he" : "grc"} dir={heb ? "rtl" : undefined}>{l?.lemma ?? state.strong}</span>
        <span className={styles.popMeta}>{[l?.translit, state.strong].filter(Boolean).join(" · ")}</span>
        <button type="button" className={styles.popClose} aria-label="Fechar" onClick={onClose}>×</button>
      </div>
      <p className={styles.popGloss}>{glossOf(l) || "Sem sentido curto cadastrado para esta palavra."}</p>
      <div className={styles.popActions}>
        <button type="button" className="btn" onClick={onDetails}>Ver detalhes</button>
        <button type="button" className="link" onClick={onNote}>Anotar</button>
        {canSendToSermon ? <button type="button" className="link" onClick={onSermon}>Levar pro sermão</button> : null}
      </div>
    </div>
  );
}
