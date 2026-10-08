"use client";

// "Esta semana" no topo de Movimentações (spec 12, fase B): a pagar e a receber da semana
// (vencidas + até domingo), cada um com Resolver. Lugar fixo: cartão vazio fica, sem botão.
// Números sem animação: são vistos dezenas de vezes por dia.
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { weekSummary, type Bill, type BillKind } from "../bills";
import styles from "../finance.module.css";

const LABEL: Record<BillKind, string> = { out: "A pagar esta semana", in: "A receber esta semana" };

export function WeekStrip({ bills, currency, onResolve }: { bills: Bill[]; currency: string; onResolve: (kind: BillKind) => void }) {
  const todayIso = isoDate(today());
  return (
    <section className={styles.week} aria-label="Esta semana">
      {(["out", "in"] as BillKind[]).map((kind) => {
        const s = weekSummary(bills, todayIso, kind);
        return (
          <div key={kind} className={styles.weekCard}>
            <div className={styles.heroLabel}>{LABEL[kind]}</div>
            {s.count === 0 ? (
              <div className={styles.weekEmpty}>Nada vence esta semana</div>
            ) : (
              <>
                <div className={styles.weekValue}>{money(s.total, currency)}</div>
                <div className={styles.weekMeta}>
                  {s.count === 1 ? "1 conta" : `${s.count} contas`}
                  {s.overdue > 0 ? <span className={styles.late}> · {s.overdue === 1 ? "1 vencida" : `${s.overdue} vencidas`}</span> : null}
                </div>
                <button type="button" className={`btn sm ${styles.press} ${styles.weekBtn}`} onClick={() => onResolve(kind)}>
                  Resolver
                </button>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
