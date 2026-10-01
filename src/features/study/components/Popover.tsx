"use client";

// Menu pequeno que cresce a partir do botão que o abriu (spec 10, Movimento). Serve às
// pílulas do editor e ao "···". Fica sempre montado: abrir/fechar é só classe (CSS
// transition, interrompível). Esc e clique fora fecham; Esc devolve o foco ao botão.
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "../study.module.css";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"]';

export function Popover({
  trigger,
  triggerClass,
  label,
  haspopup = "menu",
  align = "left",
  children,
}: {
  trigger: ReactNode;
  triggerClass?: string;
  label?: string;
  haspopup?: "menu" | "dialog";
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    pop.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    function onDown(e: PointerEvent): void {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      } else if (haspopup === "menu" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const items = [...(pop.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])];
        if (!items.length) return;
        e.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLElement);
        items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
      }
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, haspopup]);

  return (
    <div className={styles.popWrap} ref={wrap}>
      <button
        ref={btn}
        type="button"
        className={triggerClass}
        aria-label={label}
        aria-haspopup={haspopup}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      <div
        ref={pop}
        role={haspopup === "menu" ? "menu" : "dialog"}
        aria-label={label}
        className={`${styles.pop} ${align === "right" ? styles.popRight : styles.popLeft}${open ? " " + styles.popOpen : ""}`}
      >
        {children(() => {
          setOpen(false);
          btn.current?.focus();
        })}
      </div>
    </div>
  );
}
