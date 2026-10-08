"use client";

// Resolver (spec 12, fase B): as contas da semana, vencidas primeiro, com Pagar em um toque
// (valor previsto, hoje, conta da conta → padrão → primeira). A linha paga não some na hora:
// o círculo enche, aparece "Pago · Desfazer" por 5 s e só então ela recolhe.
// A lista é uma foto de quando o painel abriu; o livro atrás se atualiza a cada pagamento.
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { payBillAction, unpayBillAction } from "../bill-actions";
import { leafAccounts, type LedgerAccount } from "../domain";
import { dueLabel, weekBills, type Bill, type BillKind } from "../bills";
import styles from "../finance.module.css";

const UNDO_MS = 5000;

type RowState = "open" | "paying" | "paid" | "gone";

export function ResolvePanel({
  bills,
  kind,
  accounts,
  currency,
  nameOf,
  onChanged,
  onOpenBill,
}: {
  bills: Bill[];
  kind: BillKind;
  accounts: LedgerAccount[];
  currency: string;
  nameOf: (id: string | null) => string;
  onChanged: () => void;
  onOpenBill: (id: string) => void;
}) {
  const todayIso = isoDate(today());
  const [items] = useState(() => weekBills(bills, todayIso, kind));
  const [state, setState] = useState<Record<string, RowState>>({});
  const [error, setError] = useState("");
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  const assets = leafAccounts(accounts, "asset");
  const fallback = assets.find((a) => a.isDefault)?.id ?? assets[0]?.id ?? "";
  const set = (id: string, s: RowState): void => setState((prev) => ({ ...prev, [id]: s }));

  const pay = async (b: Bill): Promise<void> => {
    setError("");
    set(b.id, "paying");
    const res = await payBillAction(b.id, todayIso, b.accountId ?? fallback, b.amount);
    if (!res.success) {
      set(b.id, "open");
      setError(res.message);
      return;
    }
    set(b.id, "paid");
    onChanged();
    timers.current.set(b.id, window.setTimeout(() => set(b.id, "gone"), UNDO_MS));
  };

  const undo = async (b: Bill): Promise<void> => {
    window.clearTimeout(timers.current.get(b.id));
    set(b.id, "paying");
    const res = await unpayBillAction(b.id);
    if (!res.success) setError(res.message);
    set(b.id, res.success ? "open" : "paid");
    onChanged();
  };

  const left = items.filter((b) => (state[b.id] ?? "open") !== "gone");
  const isIn = kind === "in";

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        {!fallback ? <div className={styles.warn}>Cadastre uma conta (banco ou caixa) para pagar por aqui.</div> : null}
        {error ? <div className="gerr">{error}</div> : null}
        <ul className={styles.resolveList}>
          {items.map((b) => {
            const s = state[b.id] ?? "open";
            const done = s === "paid" || s === "gone";
            const late = b.dueDate < todayIso;
            return (
              <li key={b.id} className={`${styles.resolveItem}${s === "gone" ? ` ${styles.resolveGone}` : ""}`}>
                <div className={styles.resolveInner}>
                  <div className={`${styles.resolveRow}${done ? ` ${styles.resolveDone}` : ""}`}>
                    <span className={`${styles.billDot}${done ? ` ${styles.billDotPaid}` : ""}${isIn ? ` ${styles.in}` : ""}`} aria-hidden />
                    <button type="button" className={styles.resolveMain} onClick={() => onOpenBill(b.id)} disabled={done}>
                      <span className={styles.rowTitle}>{[b.description, b.payee].filter(Boolean).join(" · ")}</span>
                      <span className={`${styles.rowSub}${late && !done ? ` ${styles.late}` : ""}`}>
                        {done ? (isIn ? "Recebido" : "Pago") : dueLabel(b.dueDate, todayIso)} · {nameOf(b.categoryId)}
                      </span>
                    </button>
                    <span className={`${styles.amount}${isIn ? ` ${styles.in}` : ""}`}>{money(b.amount, currency)}</span>
                    {done ? (
                      <button type="button" className={`link ${styles.resolveUndo}`} onClick={() => void undo(b)}>
                        Desfazer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`btn sm ${styles.press} ${styles.resolvePay}`}
                        disabled={s === "paying" || !(b.accountId ?? fallback)}
                        onClick={() => void pay(b)}
                      >
                        {s === "paying" ? "…" : isIn ? "Receber" : "Pagar"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {left.length === 0 ? <div className={styles.resolveEnd}>Tudo resolvido por esta semana.</div> : null}
      </div>
    </div>
  );
}
