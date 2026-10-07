"use client";

// Chips de filtro de Sermões e Notas (spec 9). `Chip` liga/desliga; `MenuChip` abre um
// Popover e, com valor escolhido, mostra "Rótulo: valor" e um X para limpar.
import type { ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { UiIcon } from "@/components/shared/UiIcon";
import { Popover } from "./Popover";
import styles from "../study.module.css";

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.chip} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

export function MenuChip({
  label,
  value,
  onClear,
  children,
}: {
  label: string;
  value: string | null;
  onClear: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const text = value ? `${label}: ${value}` : label;
  return (
    <div className={`${styles.chipMenu}${value ? " " + styles.chipMenuOn : ""}`}>
      <Popover triggerClass={styles.chipBtn} label={text} trigger={<>{text}{value ? null : <UiIcon icon={ChevronDown} />}</>}>
        {children}
      </Popover>
      {value ? (
        <button type="button" className={styles.chipX} aria-label={`Limpar ${label.toLowerCase()}`} onClick={onClear}>
          <UiIcon icon={X} />
        </button>
      ) : null}
    </div>
  );
}

// Item de menu com contagem à direita.
export function MenuItem({ on, count, onClick, children }: { on?: boolean; count?: number; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={!!on} className={styles.mi} onClick={onClick}>
      <span>{children}</span>
      {count != null ? <span className={styles.miCount}>{count}</span> : null}
    </button>
  );
}
