"use client";

// Finanças — Movimentações (spec 10). Saldo no topo, saldo por conta, extrato por dia e
// uma ação primária: Novo lançamento (atalho N). Salvar mostra "Desfazer" por alguns
// segundos em vez de pedir confirmação.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { inPeriod, resolvePeriod, type PeriodRange, type PeriodValue } from "@/lib/utils/period";
import { voidTransactionAction } from "../actions";
import { accountBalances, groupByDay, type Movement, type TxKind } from "../domain";
import type { FinanceLedger } from "../queries";
import { Panel } from "./Panel";
import { TransactionForm } from "./TransactionForm";
import { MovementDetail } from "./MovementDetail";
import styles from "../finance.module.css";

const TOAST_MS = 6000;
const SHORT_TOAST_MS = 2500;

type PanelState = { mode: "new"; kind?: TxKind } | { mode: "view"; id: string } | null;
interface ToastState {
  message: string;
  undoEntryId?: string;
}

function dayLabel(iso: string, todayIso: string, yesterdayIso: string): string {
  if (iso === todayIso) return "Hoje";
  if (iso === yesterdayIso) return "Ontem";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

export function FinanceBoard({ ledger }: { ledger: FinanceLedger }) {
  const router = useRouter();
  const { accounts, entries, lines, movements, currency } = ledger;
  const [range, setRange] = useState<PeriodRange>(() => resolvePeriod("thisMonth", new Date()));
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [panel, setPanelState] = useState<PanelState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  // Abrir um painel tira o aviso da frente (no celular ele cobriria o botão Salvar).
  const setPanel = useCallback((next: PanelState) => {
    if (next) {
      window.clearTimeout(toastTimer.current);
      setToast(null);
    }
    setPanelState(next);
  }, []);

  const onPeriod = useCallback((v: PeriodValue) => setRange({ from: v.from, to: v.to }), []);
  const balances = useMemo(() => accountBalances(accounts, entries, lines), [accounts, entries, lines]);
  const total = balances.reduce((s, b) => s + b.balance, 0);
  const nameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const nameOf = useCallback((id: string | null) => (id && nameById.get(id)) || "", [nameById]);

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

  const showToast = useCallback((t: ToastState, ms: number) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // Atalho N: abre na hora, sem animação de espera (ação repetida).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (panel || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setPanel({ mode: "new" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, setPanel]);

  const onSaved = (entryId: string, close: () => void): void => {
    close();
    setFreshId(entryId);
    router.refresh();
    showToast({ message: "Lançamento salvo", undoEntryId: entryId }, TOAST_MS);
  };

  const undo = async (entryId: string): Promise<void> => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
    const res = await voidTransactionAction(entryId);
    router.refresh();
    showToast({ message: res.success ? "Lançamento desfeito" : res.message }, SHORT_TOAST_MS);
  };

  const viewing = panel?.mode === "view" ? movements.find((m) => m.id === panel.id) : undefined;
  const todayIso = isoDate(today());
  const yesterday = today();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = isoDate(yesterday);

  return (
    <>
      <div className={styles.head}>
        <h1 className="page">Finanças</h1>
        <PeriodFilter onChange={onPeriod} defaultPreset="thisMonth" storageKey="finance.period" align="right" />
        <button type="button" className={`btn ${styles.press}`} onClick={() => setPanel({ mode: "new" })} title="Atalho: N">
          Novo lançamento
        </button>
      </div>

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
              {b.name} <b>{money(b.balance, currency)}</b>
            </button>
          ))}
        </div>
        {visible.length > 0 ? (
          <div className={styles.periodSummary}>
            No período: entrou <b>{money(income, currency)}</b> · saiu <b>{money(expense, currency)}</b>
          </div>
        ) : null}
      </section>

      {days.length === 0 ? (
        <EmptyState hasAny={movements.some((m) => m.status === "posted")} onNew={() => setPanel({ mode: "new" })} />
      ) : (
        days.map((day) => (
          <section key={day.date} className={styles.day}>
            <div className={styles.dayLabel}>{dayLabel(day.date, todayIso, yesterdayIso)}</div>
            {day.items.map((m) => (
              <MovementRow
                key={m.id}
                movement={m}
                nameOf={nameOf}
                currency={currency}
                isFresh={m.id === freshId}
                onOpen={() => setPanel({ mode: "view", id: m.id })}
              />
            ))}
          </section>
        ))
      )}

      {panel?.mode === "new" ? (
        <Panel title="Novo lançamento" onClose={() => setPanel(null)}>
          {(close) => (
            <TransactionForm
              accounts={accounts}
              balances={balances}
              people={ledger.people}
              funds={ledger.funds}
              currency={currency}
              initialKind={panel.kind}
              onSaved={(id) => onSaved(id, close)}
              onCancel={close}
            />
          )}
        </Panel>
      ) : null}

      {viewing ? (
        <Panel title="Lançamento" onClose={() => setPanel(null)}>
          {(close) => (
            <MovementDetail
              movement={viewing}
              nameOf={nameOf}
              currency={currency}
              onClose={close}
              onVoided={() => {
                close();
                router.refresh();
                showToast({ message: "Lançamento anulado" }, SHORT_TOAST_MS);
              }}
            />
          )}
        </Panel>
      ) : null}

      {toast ? (
        <div className={styles.toast} role="status">
          <span>{toast.message}</span>
          {toast.undoEntryId ? (
            <button type="button" onClick={() => void undo(toast.undoEntryId ?? "")}>
              Desfazer
            </button>
          ) : null}
        </div>
      ) : null}
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
  const title = m.memo || (m.kind === "transfer" ? "Transferência" : counter) || "Lançamento";
  const parts =
    m.kind === "transfer"
      ? [`${account} → ${counter}`]
      : m.kind === "other"
        ? ["Lançamento do contador"]
        : [m.memo ? counter : "", account, m.donor ? `de ${m.donor}` : ""];
  const sign = m.kind === "in" ? "+" : m.kind === "out" ? "−" : "";

  return (
    <button type="button" className={`${styles.row}${isFresh ? ` ${styles.fresh}` : ""}`} onClick={onOpen}>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>{title}</div>
        <div className={styles.rowSub}>{parts.filter(Boolean).join(" · ")}</div>
      </div>
      <div className={`${styles.amount}${m.kind === "in" ? ` ${styles.in}` : ""}`}>
        {sign}
        {money(m.amount, currency)}
      </div>
    </button>
  );
}

function EmptyState({ hasAny, onNew }: { hasAny: boolean; onNew: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{hasAny ? "Nada neste período" : "Lance a primeira entrada ou saída"}</div>
      <p>
        {hasAny
          ? "Troque o período ou a conta no topo para ver outros lançamentos."
          : "Ofertas do culto, dízimos, contas pagas. O saldo de cada conta aparece aqui em cima."}
      </p>
      {hasAny ? null : (
        <button type="button" className={`btn ${styles.press}`} onClick={onNew}>
          Novo lançamento
        </button>
      )}
    </div>
  );
}
