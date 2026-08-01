"use client";

// Relatórios (Client). Balancete (trial_balance: débito/crédito/saldo por conta, até uma
// data) e uma DRE simples (receitas − despesas) derivada do MESMO balancete no cliente.
// A data-corte navega por ?asOf= (o servidor recarrega os dados via RPC).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/utils/money";
import { brDate } from "@/lib/utils/date";
import { DateField } from "@/components/shared/DateField";
import { accountTypeLabel, buildIncomeStatement, compareCode, round2, ACCOUNT_TYPE_ORDER } from "../domain";
import type { AccountType, TrialBalanceRow } from "../types";
import styles from "../accounting.module.css";

type Tab = "trial" | "dre";

export function ReportsBoard({
  rows,
  asOf,
  currency,
}: {
  rows: TrialBalanceRow[];
  asOf: string | null;
  currency: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("trial");

  const active = rows.filter((r) => round2(r.debit) !== 0 || round2(r.credit) !== 0);
  const byType = useMemo(() => {
    const map = new Map<AccountType, TrialBalanceRow[]>();
    for (const r of active) {
      const arr = map.get(r.type) ?? [];
      arr.push(r);
      map.set(r.type, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => compareCode(a.code, b.code));
    return map;
  }, [active]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of active) {
      debit += r.debit;
      credit += r.credit;
    }
    return { debit: round2(debit), credit: round2(credit) };
  }, [active]);

  const dre = useMemo(() => buildIncomeStatement(rows), [rows]);

  function onDate(v: string) {
    router.push(v ? `/accounting/reports?asOf=${v}` : "/accounting/reports");
  }

  return (
    <div className="panel">
      <div className={styles.head}>
        <nav className="tabs2" aria-label="Relatório" style={{ margin: 0, border: "none" }}>
          <button type="button" className={`tab${tab === "trial" ? " on" : ""}`} onClick={() => setTab("trial")}>
            Balancete
          </button>
          <button type="button" className={`tab${tab === "dre" ? " on" : ""}`} onClick={() => setTab("dre")}>
            DRE
          </button>
        </nav>
        <div className={styles.toolbar}>
          <label className="muted" style={{ fontSize: 13 }} htmlFor="asof">
            Até
          </label>
          <DateField value={asOf ?? ""} onChange={onDate} aria-label="Data de corte" />
          {asOf ? (
            <button type="button" className="btn ghost sm" onClick={() => onDate("")}>
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
        {asOf ? `Posição em ${brDate(asOf)}` : "Posição atual (todos os lançamentos postados)"}
      </div>

      {active.length === 0 ? (
        <div className="empty">Sem movimento postado {asOf ? "até essa data" : "ainda"}.</div>
      ) : tab === "trial" ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Conta</th>
              <th className="num">Débito</th>
              <th className="num">Crédito</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {ACCOUNT_TYPE_ORDER.filter((t) => (byType.get(t) ?? []).length > 0).map((t) => (
              <TypeBlock key={t} type={t} rows={byType.get(t) ?? []} currency={currency} />
            ))}
            <tr className={styles.totalRow}>
              <td>Totais</td>
              <td className="num">{money(totals.debit, currency)}</td>
              <td className="num">{money(totals.credit, currency)}</td>
              <td className="num">{totals.debit === totals.credit ? "✓" : money(round2(totals.debit - totals.credit), currency)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className={styles.table}>
          <tbody>
            <tr className={styles.groupHd}>
              <td colSpan={2}>Receitas</td>
            </tr>
            {dre.revenueRows.map((r) => (
              <tr key={r.accountId}>
                <td>
                  <span className="code">{r.code}</span> {r.name}
                </td>
                <td className="num pos">{money(r.balance, currency)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total de receitas</strong>
              </td>
              <td className="num pos">
                <strong>{money(dre.revenue, currency)}</strong>
              </td>
            </tr>

            <tr className={styles.groupHd}>
              <td colSpan={2}>Despesas</td>
            </tr>
            {dre.expenseRows.map((r) => (
              <tr key={r.accountId}>
                <td>
                  <span className="code">{r.code}</span> {r.name}
                </td>
                <td className="num">{money(r.balance, currency)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total de despesas</strong>
              </td>
              <td className="num">
                <strong>{money(dre.expense, currency)}</strong>
              </td>
            </tr>

            <tr className={styles.totalRow}>
              <td>{dre.result >= 0 ? "Superávit do período" : "Déficit do período"}</td>
              <td className={`num ${dre.result >= 0 ? "pos" : "neg"}`}>{money(dre.result, currency)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function TypeBlock({ type, rows, currency }: { type: AccountType; rows: TrialBalanceRow[]; currency: string }) {
  return (
    <>
      <tr className={styles.groupHd}>
        <td colSpan={4}>{accountTypeLabel(type)}</td>
      </tr>
      {rows.map((r) => (
        <tr key={r.accountId}>
          <td>
            <span className="code">{r.code}</span> {r.name}
          </td>
          <td className="num">{r.debit > 0 ? money(r.debit, currency) : ""}</td>
          <td className="num">{r.credit > 0 ? money(r.credit, currency) : ""}</td>
          <td className="num">{money(r.balance, currency)}</td>
        </tr>
      ))}
    </>
  );
}
