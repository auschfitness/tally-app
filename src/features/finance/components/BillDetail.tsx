"use client";

// Detalhe de uma conta (spec 12). Aberta: a ação primária é Pagar (valor, data e conta já
// preenchidos, dá para ajustar). Paga: mostra quando e quanto, com "Desfazer pagamento".
// Editar e Excluir ficam em segundo plano.
import { useState, useTransition } from "react";
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { MoneyField } from "@/components/shared/MoneyField";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { deleteBillAction, payBillAction, unpayBillAction } from "../bill-actions";
import { leafAccounts, type LedgerAccount } from "../domain";
import { billsInScope, dueLabel, FREQUENCY_LABEL, type Bill, type BillScope, type BillSeries } from "../bills";
import { ScopeMenu } from "./ScopeMenu";
import { Attachments } from "./Attachments";
import { boletoCode, type FinanceFile } from "../files";
import styles from "../finance.module.css";

function br(iso: string | null): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
}

export function BillDetail({
  bill,
  bills,
  series,
  accounts,
  currency,
  nameOf,
  files,
  onFilesChanged,
  onEdit,
  onDone,
}: {
  bill: Bill;
  bills: Bill[];
  series: BillSeries[];
  accounts: LedgerAccount[];
  currency: string;
  nameOf: (id: string | null) => string;
  files: FinanceFile[];
  onFilesChanged: () => void;
  onEdit: () => void;
  onDone: (message: string) => void;
}) {
  const assets = leafAccounts(accounts, "asset");
  const todayIso = isoDate(today());
  const [amount, setAmount] = useState<number | null>(bill.amount);
  const [date, setDate] = useState(todayIso);
  const [accountId, setAccountId] = useState(bill.accountId ?? assets.find((a) => a.isDefault)?.id ?? assets[0]?.id ?? "");
  const [error, setError] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [pending, start] = useTransition();

  const isIn = bill.kind === "in";
  const isPaid = bill.status === "paid";
  const freq = series.find((s) => s.id === bill.seriesId)?.frequency;
  const hasSiblings = !!bill.seriesId && billsInScope(bills, bill, "all").length > 1;

  const run = (fn: () => Promise<{ success: boolean; message?: string }>, done: string): void => {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.success) setError(res.message ?? "Algo deu errado.");
      else onDone(done);
    });
  };

  const pay = (): void => run(() => payBillAction(bill.id, date, accountId, amount ?? 0), isIn ? "Recebimento registrado" : "Pagamento registrado");
  const remove = (scope: BillScope): void => {
    setIsAsking(false);
    run(() => deleteBillAction(bill.id, scope), "Conta excluída");
  };

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <div className={styles.billHead}>
          <div className={`${styles.detailAmount}${isIn ? ` ${styles.in}` : ""}`}>{money(bill.amount, currency)}</div>
          <div className={styles.rowTitle}>{bill.description}</div>
          <div className={styles.rowSub}>
            {[nameOf(bill.categoryId), bill.payee, freq ? FREQUENCY_LABEL[freq] : ""].filter(Boolean).join(" · ")}
          </div>
          <div className={`${styles.billDue}${!isPaid && bill.dueDate < todayIso ? ` ${styles.late}` : ""}`}>
            {dueLabel(bill.dueDate, todayIso)} · {br(bill.dueDate)}
          </div>
          {bill.notes ? <p className={styles.billNotes}>{bill.notes}</p> : null}
        </div>

        {isPaid ? (
          <div className={styles.billPaid}>
            <span className={`${styles.billDot} ${styles.billDotPaid}${isIn ? ` ${styles.in}` : ""}`} aria-hidden />
            <span>
              {isIn ? "Recebido" : "Pago"} em {br(bill.paidOn)} · {money(bill.paidAmount ?? bill.amount, currency)}
              {bill.paidAmount != null && bill.paidAmount !== bill.amount ? <span className={styles.hint}> (previsto {money(bill.amount, currency)})</span> : null}
            </span>
          </div>
        ) : (
          <div className={styles.billPay}>
            <div className="mrow">
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="pay-amount">Valor {isIn ? "recebido" : "pago"}</label>
                <MoneyField id="pay-amount" name="payAmount" currency={currency} defaultValue={bill.amount} onAmountChange={setAmount} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="pay-date">Data</label>
                <DateField id="pay-date" value={date} onChange={setDate} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pay-acc">{isIn ? "Entrou em" : "Saiu de"}</label>
              <Select id="pay-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Escolha…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <Attachments files={files} target={{ billId: bill.id }} boleto={boletoCode(bill.notes)} onChanged={onFilesChanged} />

        {error ? <div className="gerr">{error}</div> : null}

        {isPaid ? null : (
          <div className={`${styles.links} ${styles.billLinks}`}>
            <button type="button" className="link" onClick={onEdit}>
              Editar
            </button>
            <span className={styles.scopeAnchor}>
              {isAsking ? <ScopeMenu title="Excluir:" only={hasSiblings ? undefined : "Excluir esta conta"} onPick={remove} onClose={() => setIsAsking(false)} /> : null}
              <button type="button" className={`link ${styles.dangerLink}`} disabled={pending} onClick={() => setIsAsking(true)}>
                Excluir
              </button>
            </span>
          </div>
        )}
      </div>

      <div className={styles.panelFoot}>
        {isPaid ? (
          <button className={`btn ghost ${styles.press}`} type="button" disabled={pending} onClick={() => run(() => unpayBillAction(bill.id), "Pagamento desfeito")}>
            {pending ? "Desfazendo…" : "Desfazer pagamento"}
          </button>
        ) : (
          <button className={`btn ${styles.press} ${styles.billPayBtn}`} type="button" disabled={pending || !accountId} onClick={pay}>
            {pending ? "Registrando…" : isIn ? "Receber" : "Pagar"}
          </button>
        )}
      </div>
    </div>
  );
}
