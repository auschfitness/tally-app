"use client";

// Celular: arrastar a ficha aberta para a direita fecha (mesmo gesto de Notas: segue o dedo 1:1,
// fecha por distância ou por velocidade, senão volta). Ignora a faixa da borda, que é do sistema
// (o voltar do iOS/Android já fecha via popstate), e campos e botões, onde arrastar não deve fechar.
import { useEffect, useRef, type RefObject } from "react";
import { swipeCloses } from "@/features/study/domain";

export function useSwipeToClose(ref: RefObject<HTMLDivElement | null>, enabled: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const EDGE = 24;
    const SLOP = 10;
    let id: number | null = null;
    let x0 = 0, y0 = 0, dx = 0, mode: "?" | "x" | "no" = "?";
    let hist: { x: number; t: number }[] = [];

    const reset = () => {
      el.style.transition = "";
      el.style.transform = "";
    };
    function down(e: PointerEvent) {
      if (e.pointerType !== "touch" || id !== null) return;
      if (e.clientX < EDGE) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable], button, a")) return;
      id = e.pointerId;
      x0 = e.clientX; y0 = e.clientY; dx = 0; mode = "?";
      hist = [{ x: e.clientX, t: e.timeStamp }];
    }
    function move(e: PointerEvent) {
      if (e.pointerId !== id) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (mode === "?") {
        if (Math.hypot(mx, my) < SLOP) return;
        mode = mx > 0 && Math.abs(mx) > Math.abs(my) * 1.2 ? "x" : "no";
        if (mode === "x") {
          el!.setPointerCapture(e.pointerId);
          el!.style.transition = "none";
        }
      }
      if (mode !== "x") return;
      dx = Math.max(0, mx);
      el!.style.transform = `translateX(${dx}px)`;
      hist.push({ x: e.clientX, t: e.timeStamp });
      if (hist.length > 5) hist.shift();
    }
    function up(e: PointerEvent) {
      if (e.pointerId !== id) return;
      id = null;
      if (mode !== "x") return;
      const a = hist[0], b = hist[hist.length - 1];
      const v = b && a && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
      if (e.type !== "pointercancel" && swipeCloses(dx, v, el!.clientWidth)) {
        el!.style.transition = "transform 200ms cubic-bezier(.32, .72, 0, 1)";
        el!.style.transform = "translateX(100%)";
        window.setTimeout(() => {
          close.current();
          // O CSS de fechado assume daqui; limpar depois do frame evita piscar.
          requestAnimationFrame(reset);
        }, 200);
      } else {
        el!.style.transition = "transform 260ms cubic-bezier(.32, .72, 0, 1)";
        el!.style.transform = "translateX(0)";
        window.setTimeout(reset, 260);
      }
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      reset();
    };
  }, [ref, enabled]);
}
