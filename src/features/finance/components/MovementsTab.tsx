"use client";

// Aba Movimentações: saldo total, saldo por conta (clicar filtra) e extrato por dia.
import { useMemo, useState } from "react";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { inPeriod, type PeriodRange } from "@/lib/utils/period";
import { groupByDay, type AccountBalance, type LedgerAccount, type Movement } from "../domain";
import { BankLogo } from "./BankLogo";
import styles from "../finance.module.css";

function dayLabel(iso: string, todayIso: string, yesterdayIso: string): string {
  if (iso === todayIso) return "Hoje";
  if (iso === yesterdayIso) return "Ontem";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
}

export function MovementsTab({
  movements,
  balances,
  accounts,
  range,
  currency,
  nameOf,
  freshId,
  onOpen,
  onNew,
  onManageAccounts,
}: {
  movements: Movement[];
  balances: AccountBalance[];
  accounts: LedgerAccount[];
  range: PeriodRange;
  currency: string;
  nameOf: (id: string | null) => string;
  freshId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onManageAccounts: () => void;
}) {
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const total = balances.reduce((s, b) => s + b.balance, 0);
  const bankOf = (id: string): string | null => accounts.find((a) => a.id === id)?.bankCode ?? null;

  const visible = useMemo(
    () =>
      movements.filter(
        (m) =>
          m.status === "posted" &&
          inPeriod(m.date, range) &&
          (!accountFilter || m.accountId === accountFilter || m.counterId === accountFilter),
      ),
    [movements, range, accountFilter],
  );
  const income = visible.filter((m) => m.kind === "in").reduce((s, m) => s + m.amount, 0);
  const expense = visible.filter((m) => m.kind === "out").reduce((s, m) => s + m.amount, 0);
  const days = useMemo(() => groupByDay(visible), [visible]);

  const todayIso = isoDate(today());
  const yesterday = today();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = isoDate(yesterday);

  return (
    <>
      <section className={styles.hero} aria-label="Saldo">
        <div className={styles.heroLabel}>Saldo em todas as contas</div>
        <div className={`${styles.heroValue}${total < 0 ? ` ${styles.negative}` : ""}`}>{money(total, currency)}</div>
        <div className={styles.accounts}>
          {balances.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={accountFilter === b.id}
              className={`${styles.account} ${styles.press}${accountFilter === b.id ? ` ${styles.on}` : ""}`}
              onClick={() => setAccountFilter((f) => (f === b.id ? null : b.id))}
            >
              <BankLogo bankCode={bankOf(b.id)} size="sm" />
              {b.name} <b>{money(b.balance, currency)}</b>
            </button>
          ))}
        </div>
        <button type="button" className={`link ${styles.manageLink}`} onClick={onManageAccounts}>
          Gerenciar contas
        </button>
        {visible.length > 0 ? (
          <div className={styles.periodSummary}>
            No período: entrou <b>{money(income, currency)}</b> · saiu <b>{money(expense, currency)}</b>
          </div>
        ) : null}
      </section>

      {days.length === 0 ? (
        <div className={styles.empty}>
          {movements.some((m) => m.status === "posted") ? (
            <>
              <div className={styles.emptyTitle}>Nada neste período</div>
              <p>Troque o período ou a conta no topo para ver outros lançamentos.</p>
            </>
          ) : (
            <>
              <div className={styles.emptyTitle}>Lance a primeira entrada ou saída</div>
              <p>Ofertas do culto, dízimos, contas pagas. O saldo de cada conta aparece aqui em cima.</p>
              <button type="button" className={`btn ${styles.press}`} onClick={onNew}>
                Novo lançamento
              </button>
            </>
          )}
        </div>
      ) : (
        days.map((day) => (
          <section key={day.date} className={styles.day}>
            <div className={styles.dayLabel}>{dayLabel(day.date, todayIso, yesterdayIso)}</div>
            {day.items.map((m) => (
              <MovementRow key={m.id} movement={m} nameOf={nameOf} currency={currency} isFresh={m.id === freshId} onOpen={() => onOpen(m.id)} />
            ))}
          </section>
        ))
      )}
    </>
  );
}

function MovementRow({
  movement: m,
  nameOf,
  currency,
  isFresh,
  onOpen,
}: {
  movement: Movement;
  nameOf: (id: string | null) => string;
  currency: string;
  isFresh: boolean;
  onOpen: () => void;
}) {
  const counter = nameOf(m.counterId);
  const account = nameOf(m.accountId);
  const title = m.kind === "opening" ? "Saldo inicial" : m.memo || (m.kind === "transfer" ? "Transferência" : counter) || "Lançamento";
  const parts =
    m.kind === "transfer"
      ? [`${account} → ${counter}`]
      : m.kind === "other"
        ? ["Lançamento do contador"]
        : m.kind === "opening"
          ? [account]
          : [m.memo ? counter : "", account, m.donor ? `de ${m.donor}` : ""];
  const sign = m.kind === "in" ? "+" : m.kind === "out" || m.amount < 0 ? "−" : "";

  return (
    <button type="button" className={`${styles.row}${isFresh ? ` ${styles.fresh}` : ""}`} onClick={onOpen}>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>{title}</div>
        <div className={styles.rowSub}>{parts.filter(Boolean).join(" · ")}</div>
      </div>
      <div className={`${styles.amount}${m.kind === "in" ? ` ${styles.in}` : ""}`}>
        {sign}
        {money(Math.abs(m.amount), currency)}
      </div>
    </button>
  );
}
