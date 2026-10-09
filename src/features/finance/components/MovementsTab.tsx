"use client";

// Aba Movimentações: o mês à vista, saldo total, saldo por conta (clicar filtra) e extrato
// por dia. Linha do banco ainda sem categoria já conta no saldo e aparece no dia dela,
// marcada "Sem categoria"; tocar abre o Classificar. Assim o número da tela bate com o banco.
import { useMemo, useState } from "react";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { inPeriod, type PeriodRange } from "@/lib/utils/period";
import type { AccountBalance, BankLine, LedgerAccount, Movement } from "../domain";
import { Paperclip } from "lucide-react";
import { cleanMemo } from "../bankText";
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

type Item = { date: string; movement: Movement; line?: undefined } | { date: string; line: BankLine; movement?: undefined };

export function MovementsTab({
  movements,
  pending,
  balances,
  accounts,
  range,
  monthName,
  currency,
  nameOf,
  freshId,
  weekStrip,
  onOpen,
  onNew,
  onManageAccounts,
  onPickBank,
  onImport,
  onClassify,
  clipIds,
}: {
  movements: Movement[];
  pending: BankLine[];
  balances: AccountBalance[];
  accounts: LedgerAccount[];
  range: PeriodRange;
  monthName: string;
  currency: string;
  nameOf: (id: string | null) => string;
  freshId: string | null;
  weekStrip: React.ReactNode;
  onOpen: (id: string) => void;
  clipIds: Set<string>;
  onNew: () => void;
  onManageAccounts: () => void;
  onPickBank: (accountId: string) => void;
  onImport: () => void;
  onClassify: () => void;
}) {
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const accountOf = (id: string): LedgerAccount | undefined => accounts.find((a) => a.id === id);

  const pendingBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of pending) m.set(l.accountId, (m.get(l.accountId) ?? 0) + l.amount);
    return m;
  }, [pending]);
  const pendingTotal = pending.reduce((s, l) => s + l.amount, 0);
  const balanceOf = (b: AccountBalance): number => b.balance + (pendingBy.get(b.id) ?? 0);
  const total = balances.reduce((s, b) => s + balanceOf(b), 0);

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const m of movements) {
      if (m.status === "posted" && inPeriod(m.date, range) && (!accountFilter || m.accountId === accountFilter || m.counterId === accountFilter)) {
        out.push({ date: m.date, movement: m });
      }
    }
    for (const l of pending) if (inPeriod(l.date, range) && (!accountFilter || l.accountId === accountFilter)) out.push({ date: l.date, line: l });
    return out;
  }, [movements, pending, range, accountFilter]);

  let income = 0;
  let expense = 0;
  for (const it of items) {
    if (it.movement?.kind === "in") income += it.movement.amount;
    else if (it.movement?.kind === "out") expense += it.movement.amount;
    else if (it.line) {
      if (it.line.amount > 0) income += it.line.amount;
      else expense -= it.line.amount;
    }
  }
  const pendingInMonth = items.filter((it) => it.line).length;

  const days = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
    const out: { date: string; items: Item[] }[] = [];
    for (const it of sorted) {
      const last = out[out.length - 1];
      if (last && last.date === it.date) last.items.push(it);
      else out.push({ date: it.date, items: [it] });
    }
    return out;
  }, [items]);

  const todayIso = isoDate(today());
  const yesterday = today();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = isoDate(yesterday);

  return (
    <>
      <section className={styles.hero} aria-label="Saldo">
        <div className={styles.heroLabel}>Saldo em todas as contas</div>
        <div className={`${styles.heroValue}${total < 0 ? ` ${styles.negative}` : ""}`}>{money(total, currency)}</div>
        {Math.abs(pendingTotal) >= 0.005 ? (
          <div className={styles.heroNote}>
            Inclui {money(Math.abs(pendingTotal), currency)} do extrato ainda sem categoria
          </div>
        ) : null}
        <div className={styles.accounts}>
          {balances.map((b) => {
            const acc = accountOf(b.id);
            const needsBank = acc && !acc.bankCode; // caixa físico tem bankCode "caixa"
            return (
              <span key={b.id} className={styles.accountWrap}>
                <button
                  type="button"
                  aria-pressed={accountFilter === b.id}
                  className={`${styles.account} ${styles.press}${accountFilter === b.id ? ` ${styles.on}` : ""}`}
                  onClick={() => setAccountFilter((f) => (f === b.id ? null : b.id))}
                >
                  <BankLogo bankCode={acc?.bankCode ?? null} size="sm" />
                  {b.name} <b>{money(balanceOf(b), currency)}</b>
                </button>
                {needsBank ? (
                  <button type="button" className={`link ${styles.whichBank}`} onClick={() => onPickBank(b.id)}>
                    Qual é o banco?
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
        <div className={`${styles.links} ${styles.manageLink}`}>
          <button type="button" className="link" onClick={onImport}>
            Importar extrato
          </button>
          <button type="button" className="link" onClick={onManageAccounts}>
            Bancos e caixa
          </button>
        </div>
      </section>

      {weekStrip}

      {items.length > 0 ? (
        <div className={styles.monthSummary}>
          <span>
            Em {monthName}: entrou <b className={styles.in}>{money(income, currency)}</b> · saiu <b>{money(expense, currency)}</b>
          </span>
          {pendingInMonth > 0 ? (
            <button type="button" className={`btn sm ${styles.press}`} onClick={onClassify}>
              Classificar {pendingInMonth === 1 ? "1 linha" : `${pendingInMonth} linhas`}
            </button>
          ) : null}
        </div>
      ) : null}

      {days.length === 0 ? (
        <div className={styles.empty}>
          {movements.some((m) => m.status === "posted") || pending.length > 0 ? (
            <>
              <div className={styles.emptyTitle}>Nada em {monthName}</div>
              <p>Use as setas acima para ver outro mês.</p>
            </>
          ) : (
            <>
              <div className={styles.emptyTitle}>Comece pelo extrato do banco</div>
              <p>Importe o arquivo do app do banco e tudo entra de uma vez. Ou lance à mão: ofertas do culto, contas pagas.</p>
              <div className={styles.emptyActions}>
                <button type="button" className={`btn ${styles.press}`} onClick={onImport}>
                  Importar extrato
                </button>
                <button type="button" className={`btn ghost ${styles.press}`} onClick={onNew}>
                  Novo lançamento
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        days.map((day) => (
          <section key={day.date} className={styles.day}>
            <div className={styles.dayLabel}>{dayLabel(day.date, todayIso, yesterdayIso)}</div>
            {day.items.map((it) =>
              it.line ? (
                <PendingRow key={it.line.id} line={it.line} account={nameOf(it.line.accountId)} currency={currency} onOpen={onClassify} />
              ) : (
                <MovementRow
                  key={it.movement.id}
                  movement={it.movement}
                  nameOf={nameOf}
                  currency={currency}
                  isFresh={it.movement.id === freshId}
                  hasFile={clipIds.has(it.movement.id)}
                  onOpen={() => onOpen(it.movement.id)}
                />
              ),
            )}
          </section>
        ))
      )}
    </>
  );
}

function PendingRow({ line, account, currency, onOpen }: { line: BankLine; account: string; currency: string; onOpen: () => void }) {
  return (
    <button type="button" className={styles.row} onClick={onOpen} title={line.description}>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>{cleanMemo(line.description) || "Sem descrição"}</div>
        <div className={styles.rowSub}>
          <span className={styles.noCategory}>Sem categoria</span> · {account}
        </div>
      </div>
      <div className={`${styles.amount}${line.amount > 0 ? ` ${styles.in}` : ""}`}>
        {line.amount > 0 ? "+" : "−"}
        {money(Math.abs(line.amount), currency)}
      </div>
    </button>
  );
}

function MovementRow({
  movement: m,
  nameOf,
  currency,
  isFresh,
  hasFile,
  onOpen,
}: {
  movement: Movement;
  nameOf: (id: string | null) => string;
  currency: string;
  isFresh: boolean;
  hasFile: boolean;
  onOpen: () => void;
}) {
  const counter = nameOf(m.counterId);
  const account = nameOf(m.accountId);
  const memo = cleanMemo(m.memo);
  const title = m.kind === "opening" ? "Saldo inicial" : memo || (m.kind === "transfer" ? "Transferência" : counter) || "Lançamento";
  const parts =
    m.kind === "transfer"
      ? [`${account} → ${counter}`]
      : m.kind === "other"
        ? ["Lançamento do contador"]
        : m.kind === "opening"
          ? [account]
          : [memo ? counter : "", account, m.donor ? `de ${m.donor}` : ""];
  const sign = m.kind === "in" ? "+" : m.kind === "out" || m.amount < 0 ? "−" : "";

  return (
    <button type="button" className={`${styles.row}${isFresh ? ` ${styles.fresh}` : ""}`} onClick={onOpen} title={m.memo || undefined}>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>{title}</div>
        <div className={styles.rowSub}>{parts.filter(Boolean).join(" · ")}</div>
      </div>
      {hasFile ? <Paperclip size={14} className={styles.clip} aria-label="Tem comprovante" /> : null}
      <div className={`${styles.amount}${m.kind === "in" ? ` ${styles.in}` : ""}`}>
        {sign}
        {money(Math.abs(m.amount), currency)}
      </div>
    </button>
  );
}
