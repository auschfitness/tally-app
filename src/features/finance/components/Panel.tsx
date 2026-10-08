"use client";

// Painel de Finanças: lateral no desktop, folha de baixo no celular (arrastar para fechar).
// Entra e sai pelo mesmo lado. O arrasto segue o dedo 1:1 respeitando onde ele pegou;
// fecha por distância ou por um gesto rápido; puxar para cima tem resistência.
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import styles from "../finance.module.css";

const CLOSE_MS = 180;
const SHEET_QUERY = "(max-width: 640px)";
const DISMISS_FRACTION = 0.25; // fecha se arrastou 1/4 da altura
const FLICK_PX_PER_MS = 0.11; // ou se o gesto foi rápido (Emil/Sonner)
const RUBBER = 0.55;

function rubberband(overshootPx: number, dimensionPx: number): number {
  return (overshootPx * dimensionPx * RUBBER) / (dimensionPx + RUBBER * overshootPx);
}

function useSheetDrag(panelRef: RefObject<HTMLDivElement | null>, onDismiss: () => void) {
  const start = useRef<{ y: number; t: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (!window.matchMedia(SHEET_QUERY).matches) return;
    if (e.target instanceof HTMLElement && e.target.closest("button")) return;
    start.current = { y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    panelRef.current?.classList.add(styles.dragging ?? "");
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const el = panelRef.current;
    if (!start.current || !el) return;
    const dy = e.clientY - start.current.y;
    const y = dy >= 0 ? dy : -rubberband(-dy, el.offsetHeight);
    el.style.transform = `translateY(${y}px)`;
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const s = start.current;
    const el = panelRef.current;
    start.current = null;
    if (!s || !el) return;
    el.classList.remove(styles.dragging ?? "");
    const dy = e.clientY - s.y;
    const elapsedMs = Math.max(1, performance.now() - s.t);
    const shouldDismiss = dy > el.offsetHeight * DISMISS_FRACTION || (dy > 12 && dy / elapsedMs > FLICK_PX_PER_MS);
    if (shouldDismiss) {
      el.style.transition = `transform ${CLOSE_MS}ms var(--ease)`;
      el.style.transform = "translateY(100%)";
      onDismiss();
    } else {
      el.style.transform = "";
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

export function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const drag = useSheetDrag(panelRef, close);
  const closingCls = isClosing ? ` ${styles.closing}` : "";

  return (
    <>
      <div className={styles.scrim + closingCls} onClick={close} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={title} className={styles.panel + closingCls}>
        <div className={styles.grip} {...drag} />
        <div className={styles.panelHead} {...drag}>
          <h3>{title}</h3>
          <button type="button" className="iconbtn" aria-label="Fechar" onClick={close}>
            ×
          </button>
        </div>
        {children(close)}
      </div>
    </>
  );
}
