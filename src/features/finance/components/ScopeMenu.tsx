"use client";

// "Aplicar a mudança em:" — menu ancorado no botão que o chamou (nasce dele, não do centro
// da tela). Esc ou clique fora fecha. Usado ao salvar/excluir conta de uma série (spec 12).
import { useEffect, useRef } from "react";
import type { BillScope } from "../bills";
import styles from "../finance.module.css";

const OPTIONS: { scope: BillScope; label: string }[] = [
  { scope: "one", label: "Só esta conta" },
  { scope: "following", label: "Esta e as próximas" },
  { scope: "all", label: "Todas as abertas" },
];

// `only` = conta avulsa: o menu vira só a confirmação ("Excluir esta conta").
export function ScopeMenu({ title, only, onPick, onClose }: { title: string; only?: string; onPick: (scope: BillScope) => void; onClose: () => void }) {
  const options = only ? [{ scope: "one" as const, label: only }] : OPTIONS;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={styles.scopeMenu} role="menu" aria-label={title}>
      <div className={styles.scopeTitle}>{title}</div>
      {options.map((o) => (
        <button key={o.scope} type="button" role="menuitem" className={styles.scopeItem} onClick={() => onPick(o.scope)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
