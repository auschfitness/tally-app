"use client";

// Balão do número do versículo (spec 08): 5 cores, Anotar, Estudar versículo. Ancorado no
// número; se passar da borda direita do texto, desliza para dentro. Esc ou toque fora fecha e o
// foco volta ao número.
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { HL_COLORS, HL_LABEL, type HlColor } from "../../reader";
import styles from "./reader.module.css";

export function VerseMenu({
  label,
  color,
  onColor,
  onNote,
  onStudy,
  onClose,
}: {
  label: string;
  color: HlColor | undefined;
  onColor: (c: HlColor) => void;
  onNote: () => void;
  onStudy: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.left = ""; // mede da posição natural (o efeito pode rodar 2x)
    // Limite = borda do texto (ele rola num contêiner mais estreito que a janela).
    // offsetWidth ignora a escala da animação de entrada.
    const edge = el.closest("article")?.getBoundingClientRect().right ?? window.innerWidth;
    const over = el.getBoundingClientRect().left + el.offsetWidth - Math.min(edge - 8, window.innerWidth - 12);
    if (over > 0) el.style.left = `${-over}px`;
    el.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onDown(e: PointerEvent): void {
      const t = e.target as Node;
      // O próprio número alterna o balão: deixa o clique dele decidir.
      if (ref.current && !ref.current.contains(t) && !ref.current.parentElement?.contains(t)) onClose();
    }
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);

  function onKey(e: KeyboardEvent<HTMLSpanElement>): void {
    // Setas e Esc aqui são do balão, não da leitura (troca de capítulo / fechar abas).
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
    if (e.key === "Escape") {
      e.preventDefault();
      ref.current?.parentElement?.querySelector<HTMLButtonElement>("button")?.focus();
      onClose();
    }
  }

  return (
    <span ref={ref} className={styles.vmenu} role="dialog" aria-label={label} onKeyDown={onKey} data-testid="verse-menu">
      <span className={styles.vmColors}>
        {HL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.swatch} ${styles[`hl_${c}`]}`}
            aria-label={c === color ? `${HL_LABEL[c]} (tirar destaque)` : HL_LABEL[c]}
            aria-pressed={c === color}
            data-color={c}
            onClick={() => onColor(c)}
          />
        ))}
      </span>
      <button type="button" className={styles.vmAction} onClick={onNote}>Anotar</button>
      <button type="button" className={styles.vmAction} onClick={onStudy}>Estudar versículo</button>
    </span>
  );
}
