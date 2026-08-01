// Visão geral da Contabilidade (Server Component). Um retrato rápido: resultado do
// exercício (DRE até hoje), receitas e despesas acumuladas, e atalhos para as seções.
// Sem hooks — money/labels são puros.
import Link from "next/link";
import { money } from "@/lib/utils/money";
import { brDate } from "@/lib/utils/date";
import { statusLabel } from "../domain";
import type { IncomeStatement, JournalEntry } from "../types";
import styles from "../accounting.module.css";

export function AccountingOverview({
  dre,
  currency,
  accountsCount,
  draftCount,
  postedCount,
  recent,
}: {
  dre: IncomeStatement;
  currency: string;
  accountsCount: number;
  draftCount: number;
  postedCount: number;
  recent: JournalEntry[];
}) {
  return (
    <>
      <div className={styles.stats}>
        <div className="stat">
          <div className="k">Receitas (até hoje)</div>
          <div className="v pos">{money(dre.revenue, currency)}</div>
        </div>
        <div className="stat">
          <div className="k">Despesas (até hoje)</div>
          <div className="v">{money(dre.expense, currency)}</div>
        </div>
        <div className="stat">
          <div className="k">{dre.result >= 0 ? "Superávit" : "Déficit"}</div>
          <div className={`v ${dre.result >= 0 ? "pos" : "neg"}`}>{money(dre.result, currency)}</div>
        </div>
      </div>

      <div className="panel">
        <div className={styles.head} style={{ marginBottom: 4 }}>
          <div>
            <strong>Lançamentos recentes</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {postedCount} postado(s) · {draftCount} rascunho(s) · {accountsCount} contas no plano
            </div>
          </div>
          <Link className="btn sm" href="/accounting/entries/new">
            Novo lançamento
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            Nenhum lançamento ainda. Comece registrando o primeiro — um débito e um crédito que se
            equilibram.
          </div>
        ) : (
          <table className={styles.table} style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Situação</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id}>
                  <td className="code">{brDate(e.date)}</td>
                  <td>
                    <Link className="link" href={`/accounting/entries/${e.id}`}>
                      {e.memo || "(sem descrição)"}
                    </Link>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {statusLabel(e.status)}
                    </span>
                  </td>
                  <td className="num">{money(e.debitTotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
