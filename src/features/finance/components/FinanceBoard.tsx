"use client";

import { useMemo, useState } from "react";
import { isThisMonth, brDate } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import { ConicDonut } from "@/components/shared/ConicDonut";
import { expenseByCat, financeMonthly, fundBalances, FINPAL, type FinanceEntry } from "../domain";
import { deleteEntryAction } from "../actions";
import { EntryModal } from "./EntryModal";
import styles from "../finance.module.css";

export function FinanceBoard({
  entries,
  currency,
  activeCampus,
  catIn,
  catOut,
  funds,
  campuses,
}: {
  entries: FinanceEntry[];
  currency: string;
  activeCampus: string;
  catIn: string[];
  catOut: string[];
  funds: string[];
  campuses: string[];
}) {
  const [finCat, setFinCat] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const monthE = entries.filter((e) => isThisMonth(e.date));
  const income = monthE.filter((e) => e.type === "in").reduce((a, e) => a + e.amount, 0);
  const expense = monthE.filter((e) => e.type === "out").reduce((a, e) => a + e.amount, 0);

  const now = useMemo(() => new Date(), []);
  const bars = useMemo(() => financeMonthly(entries, now), [entries, now]);
  const barMax = Math.max(1, ...bars.inc, ...bars.exp);
  const hasBars = bars.inc.some((v) => v > 0) || bars.exp.some((v) => v > 0);

  const expenses = useMemo(() => expenseByCat(entries), [entries]);
  const donutSegments = expenses.map((x, i) => ({ value: x.val, color: FINPAL[i % FINPAL.length]! }));

  const funds2 = useMemo(() => fundBalances(entries), [entries]);
  const fundMax = Math.max(1, ...funds2.map((x) => Math.abs(x.balance)));

  const rows = entries
    .filter((e) => !finCat || e.cat === finCat)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
        <h1 className="page">Finance Lite</h1>
        <span className="sub" style={{ margin: 0 }}>{activeCampus} · este mês</span>
      </div>

      <div className="ministrip">
        <div><div className="mi-k">Entradas</div><div className="mi-v pos">{money(income, currency)}</div></div>
        <div><div className="mi-k">Saídas</div><div className="mi-v neg">{money(expense, currency)}</div></div>
        <div><div className="mi-k">Saldo</div><div className={`mi-v ${income - expense >= 0 ? "pos" : "neg"}`}>{money(income - expense, currency)}</div></div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Entradas vs Saídas</h3>{hasBars ? <span className="muted" style={{ marginLeft: "auto" }}>6 meses</span> : null}</div>
          {hasBars ? (
            <div className={styles.finbars}>
              {bars.labels.map((lbl, i) => (
                <div key={lbl + i} className={styles.fincol}>
                  <div className={styles.finbarwrap}>
                    <div className={`${styles.finbar} ${styles.finIn}`} style={{ height: `${Math.round((bars.inc[i]! / barMax) * 100)}%` }} title={money(bars.inc[i]!, currency)} />
                    <div className={`${styles.finbar} ${styles.finOut}`} style={{ height: `${Math.round((bars.exp[i]! / barMax) * 100)}%` }} title={money(bars.exp[i]!, currency)} />
                  </div>
                  <span className={styles.finlbl}>{lbl}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: "40px 12px", lineHeight: 1.6 }}>
              Sem lançamentos ainda.<br />
              <span className="muted">Toque em “+ Lançamento” para registrar a primeira entrada ou saída — a tendência aparece aqui conforme você lança.</span>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="ph"><h3>Despesas por categoria</h3></div>
          <div className="donutwrap"><ConicDonut segments={donutSegments} /></div>
          <div className="leg">
            {expenses.length ? (
              expenses.map((x, i) => (
                <span key={x.cat} style={{ cursor: "pointer" }} onClick={() => setFinCat(finCat === x.cat ? null : x.cat)}>
                  <i style={{ background: FINPAL[i % FINPAL.length] }} />{x.cat} · {money(x.val, currency)}
                </span>
              ))
            ) : (
              <span className="muted">Sem saídas</span>
            )}
          </div>
        </div>
      </div>

      <div className="row2">
        <div className="panel">
          <div className="ph">
            <h3>Lançamentos</h3>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {finCat ? <>Categoria: {finCat} <button className="link" onClick={() => setFinCat(null)}>limpar</button></> : null}
            </span>
            <button className="btn ghost sm" style={{ marginLeft: 10 }} onClick={() => setModalOpen(true)}>+ Lançamento</button>
          </div>
          <table style={{ border: "none" }}>
            <tbody>
              <tr>
                <th>Data</th><th>Descrição</th><th>Categoria</th><th>Fundo</th>
                <th style={{ textAlign: "right" }}>Valor</th><th />
              </tr>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="empty">Nenhum lançamento.</td></tr>
              ) : (
                rows.map((e) => (
                  <tr key={e.id}>
                    <td>{brDate(e.date)}</td>
                    <td><b>{e.desc}</b></td>
                    <td><span className="muted">{e.cat}</span></td>
                    <td>{e.fund}</td>
                    <td style={{ textAlign: "right" }} className={e.type === "in" ? "pos" : "neg"}>
                      {e.type === "in" ? "+" : "-"}{money(e.amount, currency)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <form action={deleteEntryAction} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" title="Excluir" style={{ color: "var(--text-2)", border: "none", background: "none", fontSize: 15, cursor: "pointer" }}>×</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="ph"><h3>Saldo por fundo</h3></div>
          {funds2.length === 0 ? (
            <div className="empty">Sem fundos.</div>
          ) : (
            funds2.map((x) => (
              <div key={x.fund} className={styles.fundrow}>
                <div className={styles.fundlbl}>{x.fund}<span className={x.balance >= 0 ? "pos" : "neg"}>{money(x.balance, currency)}</span></div>
                <div className="gbar"><i className={x.balance >= 0 ? "healthy" : "risk"} style={{ width: `${Math.round((Math.abs(x.balance) / fundMax) * 100)}%` }} /></div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalOpen ? (
        <EntryModal
          catIn={catIn}
          catOut={catOut}
          funds={funds}
          campuses={campuses}
          activeCampus={activeCampus}
          currency={currency}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}
