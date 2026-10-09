// "‹ Outubro de 2026 ›": o mês à vista, um toque para o anterior. Quase toda pergunta de
// tesoureiro é "e o mês passado?", então a troca de período é isto e não um menu.
import { isoDate, today } from "@/lib/utils/date";
import type { PeriodRange } from "@/lib/utils/period";
import styles from "../finance.module.css";

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y ?? 0, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(month: string): PeriodRange {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y ?? 0, m ?? 1, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export const thisMonth = (): string => isoDate(today()).slice(0, 7);

export function MonthNav({ month, onMonth }: { month: string; onMonth: (month: string) => void }) {
  return (
    <div className={`${styles.monthNav} ${styles.noprint}`}>
      <button type="button" className={`btn ghost ${styles.press}`} aria-label="Mês anterior" onClick={() => onMonth(shiftMonth(month, -1))}>
        ‹
      </button>
      <span className={styles.monthName} aria-live="polite">
        {monthLabel(month)}
      </span>
      <button type="button" className={`btn ghost ${styles.press}`} aria-label="Próximo mês" disabled={month >= thisMonth()} onClick={() => onMonth(shiftMonth(month, 1))}>
        ›
      </button>
    </div>
  );
}
