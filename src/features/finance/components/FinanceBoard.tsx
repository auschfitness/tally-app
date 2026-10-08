"use client";

// Finanças (spec 10) — casca do módulo: cabeçalho com período e UMA ação primária, abas
// (Movimentações · Dízimos), o painel de lançamento e o aviso com Desfazer. Salvar
// nunca pede confirmação: mostra "Desfazer" por alguns segundos.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { resolvePeriod, type PeriodRange, type PeriodValue } from "@/lib/utils/period";
import { isoDate, today } from "@/lib/utils/date";
import type { Donation, ReceiptListItem } from "@/features/giving/types";
import { voidTransactionAction } from "../actions";
import { accountBalances, isGivingCategory, leafAccounts, type TxKind } from "../domain";
import type { FinanceLedger } from "../queries";
import { Panel } from "./Panel";
import { TransactionForm } from "./TransactionForm";
import { MovementDetail } from "./MovementDetail";
import { MovementsTab } from "./MovementsTab";
import { AccountsManager } from "./AccountsManager";
import { ImportPanel } from "./ImportPanel";
import { ClassifyPanel } from "./ClassifyPanel";
import { TithesTab } from "./TithesTab";
import { FinanceTabs, type FinanceTabKey } from "./FinanceTabs";
import { BillsTab } from "./BillsTab";
import { BillForm } from "./BillForm";
import { BillDetail } from "./BillDetail";
import { WeekStrip } from "./WeekStrip";
import { ResolvePanel } from "./ResolvePanel";
import type { Bill, BillKind, BillSeries } from "../bills";
import type { FinanceFile } from "../files";
import { ClosingTab, shiftMonth } from "./ClosingTab";
import styles from "../finance.module.css";

const TOAST_MS = 6000;
const SHORT_TOAST_MS = 2500;

export type FinanceTab = Exclude<FinanceTabKey, "contador">;

type PanelState = { mode: "new"; kind?: TxKind; counterId?: string } | { mode: "view"; id: string } | { mode: "accounts" } | { mode: "import" } | { mode: "classify" } | { mode: "bill-new" } | { mode: "bill"; id: string } | { mode: "bill-edit"; id: string } | { mode: "resolve"; kind: BillKind } | null;
interface ToastState {
  message: string;
  undoEntryId?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

export function FinanceBoard({
  ledger,
  tab,
  donations,
  receipts,
  bills,
  series,
  files,
}: {
  ledger: FinanceLedger;
  tab: FinanceTab;
  donations: Donation[];
  receipts: ReceiptListItem[];
  bills: Bill[];
  series: BillSeries[];
  files: FinanceFile[];
}) {
  const router = useRouter();
  const { accounts, entries, lines, movements, currency } = ledger;
  const [range, setRange] = useState<PeriodRange>(() => resolvePeriod("thisMonth", new Date()));
  const [panel, setPanelState] = useState<PanelState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  // Fechamento abre no mês passado: é o que o tesoureiro fecha no começo do mês.
  const [closingMonth, setClosingMonth] = useState(() => shiftMonth(isoDate(today()).slice(0, 7), -1));
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
  const nameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const nameOf = useCallback((id: string | null) => (id && nameById.get(id)) || "", [nameById]);
  const clipIds = useMemo(() => new Set(files.flatMap((f) => [f.billId, f.entryId]).filter((id): id is string => !!id)), [files]);
  const titheCategoryId = useMemo(
    () => leafAccounts(accounts, "revenue").find((a) => isGivingCategory(a.name))?.id,
    [accounts],
  );

  const openNew = useCallback(
    () =>
      setPanel(
        tab === "contas" ? { mode: "bill-new" } : tab === "dizimos" ? { mode: "new", kind: "in", counterId: titheCategoryId } : { mode: "new" },
      ),
    [setPanel, tab, titheCategoryId],
  );

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
        openNew();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, openNew]);

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
  const billOpen = panel?.mode === "bill" || panel?.mode === "bill-edit" ? bills.find((b) => b.id === panel.id) : undefined;
  const onBillDone = (message: string, close: () => void): void => {
    close();
    router.refresh();
    showToast({ message }, SHORT_TOAST_MS);
  };

  return (
    <>
      <div className={styles.head}>
        <h1 className="page">Finanças</h1>
        {tab === "fechamento" ? (
          <button type="button" className={`btn ${styles.press}`} onClick={() => window.print()}>
            Imprimir / PDF
          </button>
        ) : (
          <>
            {tab === "contas" ? null : <PeriodFilter onChange={onPeriod} defaultPreset="thisMonth" storageKey="finance.period" align="right" />}
            <button type="button" className={`btn ${styles.press}`} onClick={openNew} title="Atalho: N">
              {tab === "contas" ? "Nova conta" : tab === "dizimos" ? "Registrar dízimo" : "Novo lançamento"}
            </button>
          </>
        )}
      </div>

      <FinanceTabs active={tab} />

      {tab === "fechamento" ? (
        <ClosingTab
          month={closingMonth}
          onMonth={setClosingMonth}
          orgName={ledger.orgName}
          accounts={accounts}
          entries={entries}
          lines={lines}
          movements={movements}
          currency={currency}
          nameOf={nameOf}
        />
      ) : tab === "contas" ? (
        <BillsTab bills={bills} series={series} currency={currency} nameOf={nameOf} onOpen={(id) => setPanel({ mode: "bill", id })} onNew={openNew} clipIds={clipIds} />
      ) : tab === "dizimos" ? (
        <TithesTab donations={donations} receipts={receipts} range={range} currency={currency} onRegister={openNew} />
      ) : (
        <>
          {bills.length > 0 ? <WeekStrip bills={bills} currency={currency} onResolve={(kind) => setPanel({ mode: "resolve", kind })} /> : null}
          <MovementsTab
            movements={movements}
            balances={balances}
            accounts={accounts}
            range={range}
            currency={currency}
            nameOf={nameOf}
            freshId={freshId}
            onOpen={(id) => setPanel({ mode: "view", id })}
            onNew={openNew}
            onManageAccounts={() => setPanel({ mode: "accounts" })}
            onImport={() => setPanel({ mode: "import" })}
            onClassify={() => setPanel({ mode: "classify" })}
            pendingCount={ledger.pendingCount}
            clipIds={clipIds}
          />
        </>
      )}

      {panel?.mode === "resolve" ? (
        <Panel title={panel.kind === "in" ? "A receber esta semana" : "A pagar esta semana"} onClose={() => setPanel(null)}>
          {() => (
            <ResolvePanel
              bills={bills}
              kind={panel.kind}
              accounts={accounts}
              currency={currency}
              nameOf={nameOf}
              onChanged={() => router.refresh()}
              onOpenBill={(id) => setPanelState({ mode: "bill", id })}
              clipIds={clipIds}
            />
          )}
        </Panel>
      ) : null}

      {panel?.mode === "new" ? (
        <Panel title={panel.counterId ? "Registrar dízimo" : "Novo lançamento"} onClose={() => setPanel(null)}>
          {(close) => (
            <TransactionForm
              accounts={accounts}
              balances={balances}
              people={ledger.people}
              funds={ledger.funds}
              currency={currency}
              initialKind={panel.kind}
              initialCounterId={panel.counterId}
              onSaved={(id) => onSaved(id, close)}
              onCancel={close}
            />
          )}
        </Panel>
      ) : null}

      {panel?.mode === "accounts" ? (
        <Panel title="Contas" onClose={() => setPanel(null)}>
          {(close) => <AccountsManager accounts={accounts} balances={balances} movements={movements} currency={currency} onClose={close} />}
        </Panel>
      ) : null}

      {panel?.mode === "import" ? (
        <Panel title="Importar extrato" onClose={() => setPanel(null)}>
          {(close) => <ImportPanel accounts={accounts} currency={currency} onClose={close} onClassify={() => setPanelState({ mode: "classify" })} />}
        </Panel>
      ) : null}

      {panel?.mode === "classify" ? (
        <Panel title="Classificar extrato" onClose={() => setPanel(null)}>
          {(close) => <ClassifyPanel accounts={accounts} movements={movements} currency={currency} onClose={close} />}
        </Panel>
      ) : null}

      {panel?.mode === "bill-new" || (panel?.mode === "bill-edit" && billOpen) ? (
        <Panel title={billOpen ? "Editar conta" : "Nova conta"} onClose={() => setPanel(null)}>
          {(close) => (
            <BillForm
              bill={billOpen}
              bills={bills}
              accounts={accounts}
              currency={currency}
              onSaved={(_id, message) => onBillDone(message, close)}
              onCancel={close}
            />
          )}
        </Panel>
      ) : null}

      {panel?.mode === "bill" && billOpen ? (
        <Panel title={billOpen.kind === "in" ? "A receber" : "A pagar"} onClose={() => setPanel(null)}>
          {(close) => (
            <BillDetail
              bill={billOpen}
              bills={bills}
              series={series}
              accounts={accounts}
              currency={currency}
              nameOf={nameOf}
              files={files.filter((f) => f.billId === billOpen.id)}
              onFilesChanged={() => router.refresh()}
              onEdit={() => setPanelState({ mode: "bill-edit", id: billOpen.id })}
              onDone={(message) => onBillDone(message, close)}
            />
          )}
        </Panel>
      ) : null}

      {viewing ? (
        <Panel title="Lançamento" onClose={() => setPanel(null)}>
          {(close) => (
            <MovementDetail
              movement={viewing}
              files={files.filter((f) => f.entryId === viewing.id)}
              onFilesChanged={() => router.refresh()}
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
