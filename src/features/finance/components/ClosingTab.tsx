"use client";

// Aba Fechamento (spec 10, fase 4): o relatório do mês para apresentar ao conselho e
// mandar ao contador. Linguagem de tesoureiro; imprimir/PDF é o do próprio navegador.
import { money } from "@/lib/utils/money";
import { brDate, isoDate, today } from "@/lib/utils/date";
import { monthClose, type CategoryTotal, type LedgerAccount, type LedgerEntry, type LedgerLine, type Movement } from "../domain";
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

export function ClosingTab({
  month,
  onMonth,
  orgName,
  accounts,
  entries,
  lines,
  movements,
  currency,
  nameOf,
}: {
  month: string;
  onMonth: (month: string) => void;
  orgName: string;
  accounts: LedgerAccount[];
  entries: LedgerEntry[];
  lines: LedgerLine[];
  movements: Movement[];
  currency: string;
  nameOf: (id: string | null) => string;
}) {
  const r = monthClose(month, accounts, entries, lines, movements);
  const isCurrentOrFuture = month >= isoDate(today()).slice(0, 7);
  const fmt = (n: number): string => money(n, currency);

  return (
    <>
      <div className={`${styles.monthNav} ${styles.noprint}`}>
        <button type="button" className={`btn ghost ${styles.press}`} aria-label="Mês anterior" onClick={() => onMonth(shiftMonth(month, -1))}>
          ‹
        </button>
        <span className={styles.monthName}>{monthLabel(month)}</span>
        <button
          type="button"
          className={`btn ghost ${styles.press}`}
          aria-label="Próximo mês"
          disabled={isCurrentOrFuture}
          onClick={() => onMonth(shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>

      <article className={styles.report} aria-label={`Fechamento de ${monthLabel(month)}`}>
        <header className={styles.reportHead}>
          <div className={styles.reportOrg}>{orgName}</div>
          <h2>Fechamento de {monthLabel(month)}</h2>
        </header>

        <section className={styles.reportBlock}>
          <ReportRow label="Saldo no início do mês" value={fmt(r.opening)} />
          {r.openingSet !== 0 ? <ReportRow label="Saldo inicial de contas novas" value={fmt(r.openingSet)} /> : null}
          <ReportRow label="Entradas" value={`+${fmt(r.income)}`} tone="in" />
          <ReportRow label="Saídas" value={`−${fmt(r.expense)}`} />
          {r.other !== 0 ? <ReportRow label="Outros lançamentos do contador" value={fmt(r.other)} /> : null}
          <ReportRow label="Saldo no fim do mês" value={fmt(r.closing)} strong />
        </section>

        <CategoryBlock title="Entradas por categoria" rows={r.incomeByCategory} total={r.income} nameOf={nameOf} fmt={fmt} empty="Nenhuma entrada no mês." />
        <CategoryBlock title="Saídas por categoria" rows={r.expenseByCategory} total={r.expense} nameOf={nameOf} fmt={fmt} empty="Nenhuma saída no mês." />

        <section className={styles.reportBlock}>
          <h3>Saldo por conta</h3>
          <div className={`${styles.reportRow} ${styles.reportCols}`}>
            <span />
            <span>Início</span>
            <span>Fim</span>
          </div>
          {r.accounts.map((a) => (
            <div key={a.id} className={`${styles.reportRow} ${styles.reportCols}`}>
              <span>{a.name}</span>
              <b>{fmt(a.opening)}</b>
              <b>{fmt(a.closing)}</b>
            </div>
          ))}
        </section>

        <footer className={styles.reportFoot}>
          <div className={styles.signatures}>
            <div>Tesoureiro(a)</div>
            <div>Pastor(a) ou presidente</div>
          </div>
          <p>Gerado em {brDate(isoDate(today()))} pelo Mercy.</p>
        </footer>
      </article>
    </>
  );
}

function ReportRow({ label, value, tone, strong }: { label: string; value: string; tone?: "in"; strong?: boolean }) {
  return (
    <div className={`${styles.reportRow}${strong ? ` ${styles.reportStrong}` : ""}`}>
      <span>{label}</span>
      <b className={tone === "in" ? styles.in : undefined}>{value}</b>
    </div>
  );
}

function CategoryBlock({
  title,
  rows,
  total,
  nameOf,
  fmt,
  empty,
}: {
  title: string;
  rows: CategoryTotal[];
  total: number;
  nameOf: (id: string | null) => string;
  fmt: (n: number) => string;
  empty: string;
}) {
  return (
    <section className={styles.reportBlock}>
      <h3>{title}</h3>
      {rows.length === 0 ? <p className="muted">{empty}</p> : null}
      {rows.map((c) => (
        <div key={c.id} className={styles.reportRow}>
          <span>{nameOf(c.id)}</span>
          <b>
            {fmt(c.total)} <small>{total > 0 ? `${Math.round((c.total / total) * 100)}%` : ""}</small>
          </b>
        </div>
      ))}
    </section>
  );
}
