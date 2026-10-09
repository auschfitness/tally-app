"use client";

// "Esta semana" em Movimentações (spec 12, fase B), compacto: uma linha para o que vence a
// pagar e outra para o que vence a receber (vencidas + até domingo), cada uma com Resolver.
// Sem nada vencendo, uma frase só. Números sem animação: são vistos dezenas de vezes por dia.
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { weekSummary, type Bill, type BillKind } from "../bills";
import styles from "../finance.module.css";

const LABEL: Record<BillKind, string> = { out: "A pagar esta semana", in: "A receber esta semana" };

export function WeekStrip({ bills, currency, onResolve }: { bills: Bill[]; currency: string; onResolve: (kind: BillKind) => void }) {
  const todayIso = isoDate(today());
  const rows = (["out", "in"] as BillKind[]).map((kind) => ({ kind, s: weekSummary(bills, todayIso, kind) })).filter((r) => r.s.count > 0);
  return (
    <section className={styles.week} aria-label="Esta semana">
      {rows.length === 0 ? <div className={styles.weekEmpty}>Nada a pagar ou receber esta semana</div> : null}
      {rows.map(({ kind, s }) => (
        <div key={kind} className={styles.weekRow}>
          <div className={styles.rowMain}>
            <div className={styles.rowSub}>{LABEL[kind]}</div>
            <div className={styles.weekLine}>
              <b className={kind === "in" ? styles.in : undefined}>{money(s.total, currency)}</b>
              <span>
                {s.count === 1 ? "1 conta" : `${s.count} contas`}
                {s.overdue > 0 ? <span className={styles.late}> · {s.overdue === 1 ? "1 vencida" : `${s.overdue} vencidas`}</span> : null}
              </span>
            </div>
          </div>
          <button type="button" className={`btn sm ghost ${styles.press}`} onClick={() => onResolve(kind)}>
            Resolver
          </button>
        </div>
      ))}
    </section>
  );
}
