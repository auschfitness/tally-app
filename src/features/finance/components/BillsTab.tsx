"use client";

// Aba "A pagar e receber" (spec 12): compromissos abertos agrupados por vencimento
// (Vencidas · Esta semana · Próxima semana · meses) e as pagas recolhidas no fim.
import { useMemo, useState } from "react";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { dueLabel, FREQUENCY_LABEL, groupOpenBills, type Bill, type BillKind, type BillSeries } from "../bills";
import { Paperclip } from "lucide-react";
import styles from "../finance.module.css";

type Filter = "all" | BillKind;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "out", label: "A pagar" },
  { key: "in", label: "A receber" },
];

export function BillsTab({
  bills,
  series,
  currency,
  nameOf,
  onOpen,
  onNew,
  clipIds,
}: {
  bills: Bill[];
  series: BillSeries[];
  currency: string;
  nameOf: (id: string | null) => string;
  onOpen: (id: string) => void;
  onNew: () => void;
  clipIds: Set<string>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [isPaidOpen, setIsPaidOpen] = useState(false);
  const todayIso = isoDate(today());
  const visible = useMemo(() => bills.filter((b) => filter === "all" || b.kind === filter), [bills, filter]);
  const groups = useMemo(() => groupOpenBills(visible, todayIso), [visible, todayIso]);
  const paid = useMemo(() => visible.filter((b) => b.status === "paid").sort((a, b) => (b.paidOn ?? "").localeCompare(a.paidOn ?? "")), [visible]);
  const frequencyOf = (id: string | null) => series.find((s) => s.id === id)?.frequency;

  const row = (b: Bill) => {
    const freq = frequencyOf(b.seriesId);
    const sub = [nameOf(b.categoryId), b.payee, freq ? FREQUENCY_LABEL[freq] : ""].filter(Boolean).join(" · ");
    const isPaid = b.status === "paid";
    const isLate = !isPaid && b.dueDate < todayIso;
    return (
      <button key={b.id} type="button" className={styles.row} onClick={() => onOpen(b.id)}>
        <span className={`${styles.billDot}${isPaid ? ` ${styles.billDotPaid}` : ""}${b.kind === "in" ? ` ${styles.in}` : ""}`} aria-hidden />
        <div className={styles.rowMain}>
          <div className={styles.rowTitle}>{b.description}</div>
          <div className={styles.rowSub}>{sub}</div>
        </div>
        {clipIds.has(b.id) ? <Paperclip size={14} className={styles.clip} aria-label="Tem comprovante" /> : null}
        <div className={styles.billRight}>
          <div className={`${styles.amount}${b.kind === "in" ? ` ${styles.in}` : ""}`}>
            {b.kind === "in" ? "+" : "−"}
            {money(isPaid ? (b.paidAmount ?? b.amount) : b.amount, currency)}
          </div>
          <div className={`${styles.billDue}${isLate ? ` ${styles.late}` : ""}`}>
            {isPaid ? `${b.kind === "in" ? "Recebido" : "Pago"} ${b.paidOn?.slice(8, 10)}/${b.paidOn?.slice(5, 7)}` : dueLabel(b.dueDate, todayIso)}
          </div>
        </div>
      </button>
    );
  };

  if (bills.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>Nada a pagar ou a receber</div>
        <p>Cadastre as contas da igreja (luz, água, aluguel) e elas aparecem aqui antes de vencer.</p>
        <button type="button" className={`btn ${styles.press}`} onClick={onNew}>
          Nova conta
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.kinds} ${styles.billFilter}`} role="tablist" aria-label="Filtrar contas">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`${styles.kind} ${styles.press}${filter === f.key ? ` ${styles.on}` : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? <div className={styles.empty}><p>Nenhuma conta aberta aqui.</p></div> : null}
      {groups.map((g) => {
        // Total só com filtro: somar pagar e receber juntos não diz nada.
        const total = g.items.reduce((s, b) => s + b.amount, 0);
        return (
          <section key={g.key} className={styles.day}>
            <div className={`${styles.dayLabel} ${styles.billGroupHead}${g.key === "overdue" ? ` ${styles.late}` : ""}`}>
              <span>{g.label}</span>
              {filter !== "all" ? <span>{money(total, currency)}</span> : null}
            </div>
            {g.items.map(row)}
          </section>
        );
      })}

      {paid.length > 0 ? (
        <section className={styles.day}>
          <button type="button" className="link" onClick={() => setIsPaidOpen((v) => !v)} aria-expanded={isPaidOpen}>
            {isPaidOpen ? "Esconder pagas" : `Pagas e recebidas (${paid.length})`}
          </button>
          {isPaidOpen ? paid.map(row) : null}
        </section>
      ) : null}
    </>
  );
}
