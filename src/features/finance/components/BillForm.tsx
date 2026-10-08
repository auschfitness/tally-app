"use client";

// Nova conta / editar conta (spec 12). Pagar · Receber, valor grande, vencimento, categoria,
// conta, "Repete" (só na criação). Editar uma conta de série pergunta o alcance antes de salvar.
import { useState, useTransition } from "react";
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { MoneyField } from "@/components/shared/MoneyField";
import { isoDate, today } from "@/lib/utils/date";
import { saveBillAction } from "../bill-actions";
import { leafAccounts, type LedgerAccount } from "../domain";
import { billsInScope, FREQUENCY_LABEL, type Bill, type BillFrequency, type BillKind, type BillScope } from "../bills";
import { ScopeMenu } from "./ScopeMenu";
import styles from "../finance.module.css";

const KIND_LABEL: Record<BillKind, string> = { out: "A pagar", in: "A receber" };

export function BillForm({
  bill,
  bills,
  accounts,
  currency,
  onSaved,
  onCancel,
}: {
  bill?: Bill; // presente = editar
  bills: Bill[];
  accounts: LedgerAccount[];
  currency: string;
  onSaved: (id: string, message: string) => void;
  onCancel: () => void;
}) {
  const assets = leafAccounts(accounts, "asset");
  const [kind, setKind] = useState<BillKind>(bill?.kind ?? "out");
  const [amount, setAmount] = useState<number | null>(bill?.amount ?? null);
  const [description, setDescription] = useState(bill?.description ?? "");
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? isoDate(today()));
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? "");
  const [accountId, setAccountId] = useState(bill?.accountId ?? assets.find((a) => a.isDefault)?.id ?? "");
  const [payee, setPayee] = useState(bill?.payee ?? "");
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [repeat, setRepeat] = useState<BillFrequency | "">("");
  const [until, setUntil] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [pending, start] = useTransition();

  const categories = leafAccounts(accounts, kind === "in" ? "revenue" : "expense");
  // Pergunta o alcance só se existir outra conta aberta da série além desta.
  const hasSiblings = !!bill?.seriesId && billsInScope(bills, bill, "all").length > 1;

  const save = (scope: BillScope): void => {
    setIsAsking(false);
    start(async () => {
      const res = await saveBillAction(
        { id: bill?.id ?? null, kind, description, amount: amount ?? 0, dueDate, categoryId, accountId: accountId || null, payee, notes, repeat: repeat || null, until: until || null },
        scope,
      );
      if (!res.success) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
        return;
      }
      onSaved(res.data.id, bill ? "Conta salva" : repeat ? `Conta criada · ${FREQUENCY_LABEL[repeat].toLowerCase()}` : "Conta criada");
    });
  };

  return (
    <form
      className={styles.panelForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (hasSiblings) setIsAsking(true);
        else save("one");
      }}
    >
      <div className={styles.panelBody}>
        {bill ? null : (
          <div className={styles.kinds} role="tablist" aria-label="Tipo de conta">
            {(Object.keys(KIND_LABEL) as BillKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                className={`${styles.kind} ${styles.press}${kind === k ? ` ${styles.on}` : ""}`}
                onClick={() => {
                  setKind(k);
                  setCategoryId("");
                }}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        )}

        <div className={styles.bigAmount}>
          <MoneyField name="amount" currency={currency} defaultValue={bill?.amount} autoFocus={!bill} onAmountChange={setAmount} />
          {errors.amount ? <div className="gerr">{errors.amount[0]}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="bill-desc">Descrição</label>
          <input id="bill-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === "in" ? "Ex.: Aluguel do salão" : "Ex.: Conta de luz"} autoComplete="off" />
          {errors.description ? <div className="gerr">{errors.description[0]}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="bill-due">Vencimento</label>
          <DateField id="bill-due" value={dueDate} onChange={setDueDate} />
          {errors.dueDate ? <div className="gerr">{errors.dueDate[0]}</div> : null}
          {bill?.seriesId ? <div className={styles.hint}>Mudar a data vale só para esta conta.</div> : null}
        </div>

        <div className="field">
          <label htmlFor="bill-cat">Categoria</label>
          <Select id="bill-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Escolha…</option>
            {categories.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          {errors.categoryId ? <div className="gerr">{errors.categoryId[0]}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="bill-acc">{kind === "in" ? "Entra em" : "Sai de"}</label>
          <Select id="bill-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Escolher na hora de pagar</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        {bill ? null : (
          <div className="mrow">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="bill-repeat">Repete</label>
              <Select id="bill-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as BillFrequency | "")}>
                <option value="">Não</option>
                {(Object.keys(FREQUENCY_LABEL) as BillFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </Select>
            </div>
            {repeat ? (
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="bill-until">Até (opcional)</label>
                <DateField id="bill-until" value={until} onChange={setUntil} />
                {errors.until ? <div className="gerr">{errors.until[0]}</div> : null}
              </div>
            ) : null}
          </div>
        )}

        <div className="field">
          <label htmlFor="bill-payee">{kind === "in" ? "De quem (opcional)" : "Para quem (opcional)"}</label>
          <input id="bill-payee" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={kind === "in" ? "Ex.: Escola Esperança" : "Ex.: Celesc"} autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="bill-notes">Observações</label>
          <textarea id="bill-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Código do boleto, chave Pix…" />
        </div>

        {message ? <div className="gerr">{message}</div> : null}
      </div>

      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <div className={styles.scopeAnchor}>
          {isAsking ? <ScopeMenu title="Aplicar a mudança em:" onPick={save} onClose={() => setIsAsking(false)} /> : null}
          <button className={`btn ${styles.press}`} type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}
