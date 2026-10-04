"use client";

// Barra de ação da seleção de versículos (spec 08): cores, Anotar, Original, Copiar.
// No desktop flutua ancorada no ponto tocado (dentro do texto); no celular vira gaveta
// embaixo. Esc ou o X limpam a seleção; toda ação limpa depois de agir.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { HL_COLORS, HL_LABEL, type HlColor } from "../../reader";
import { UiIcon } from "@/components/shared/UiIcon";
import { X, Pencil, Languages, Copy, Check } from "lucide-react";
import styles from "./reader.module.css";

export function SelectionBar({
  label,
  anchor,
  colors,
  copyText,
  onColor,
  onNote,
  onStudy,
  onClose,
}: {
  label: string;
  anchor: { x: number; y: number };
  // Cor de cada versículo selecionado (undefined = sem destaque).
  colors: (HlColor | undefined)[];
  copyText: string;
  onColor: (c: HlColor | null) => void;
  onNote: () => void;
  onStudy: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box || getComputedStyle(el).position === "fixed") return; // gaveta: sem ancoragem
    el.style.left = ""; // mede da posição natural (o efeito pode rodar 2x no StrictMode)
    // offsetWidth ignora a escala da animação de entrada; o limite é a borda do texto.
    const max = box.clientWidth - 8 - el.offsetWidth;
    if (anchor.x > max) el.style.left = `${Math.max(8, max)}px`;
  }, [anchor, label]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function copy(): void {
    navigator.clipboard.writeText(copyText).then(
      () => {
        setCopied(true);
        timer.current = window.setTimeout(onClose, 1500);
      },
      () => onClose(), // sem permissão de área de transferência: só fecha
    );
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>): void {
    // Setas e Esc aqui são da barra, não da leitura (troca de capítulo / fechar abas).
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  const style = { "--x": `${anchor.x}px`, "--y": `${anchor.y}px` } as CSSProperties;

  return (
    <div ref={ref} className={styles.selBar} style={style} role="toolbar" aria-label="Ações do versículo" data-testid="selection-bar" onKeyDown={onKey}>
      <span className={styles.selLabel} data-testid="selection-label">{label}</span>
      <span className={styles.selColors}>
        {HL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.swatch} ${styles[`hl_${c}`]}`}
            aria-label={HL_LABEL[c]}
            aria-pressed={colors.every((x) => x === c)}
            data-color={c}
            onClick={() => onColor(c)}
          />
        ))}
        {colors.some(Boolean) ? (
          <button type="button" className={styles.swatchOff} aria-label="Tirar destaque" onClick={() => onColor(null)}><UiIcon icon={X} /></button>
        ) : null}
      </span>
      <span className={styles.selActions}>
        <button type="button" className={styles.selAction} onClick={onNote}><UiIcon icon={Pencil} />Anotar</button>
        <button type="button" className={styles.selAction} onClick={onStudy}><UiIcon icon={Languages} />Original</button>
        <button type="button" className={styles.selAction} onClick={copy} disabled={copied}><UiIcon icon={copied ? Check : Copy} />{copied ? "Copiado" : "Copiar"}</button>
      </span>
      <button type="button" className={styles.selClose} aria-label="Fechar seleção" onClick={onClose}><UiIcon icon={X} /></button>
    </div>
  );
}
