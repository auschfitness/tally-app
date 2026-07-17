"use client";

import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { MoneyField } from "@/components/shared/MoneyField";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createEntryAction } from "../actions";
import { type EntryType } from "../domain";
import { type ActionResult } from "@/lib/errors";
import { isoDate, today } from "@/lib/utils/date";

const INITIAL: ActionResult = { success: true, data: undefined };
const NEW = "__new__";

export function EntryModal({
  catIn,
  catOut,
  funds,
  currency,
  onClose,
}: {
  catIn: string[];
  catOut: string[];
  funds: string[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<EntryType>("in");
  const [catSel, setCatSel] = useState<string>("");
  const [state, formAction, pending] = useActionState(createEntryAction, INITIAL);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const cats = type === "in" ? catIn : catOut;
  const isNew = catSel === NEW;
  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>Novo lançamento</h3>
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="newCategory" value={isNew ? "1" : "0"} />

        <div className="field">
          <label>Tipo</label>
          <div className="seg">
            <button type="button" data-t="in" className={type === "in" ? "on" : ""} onClick={() => { setType("in"); setCatSel(""); }}>Entrada</button>
            <button type="button" data-t="out" className={type === "out" ? "on" : ""} onClick={() => { setType("out"); setCatSel(""); }}>Saída</button>
          </div>
        </div>

        <div className="field">
          <label>Descrição</label>
          <input name="desc" placeholder="Ex.: Dízimos de domingo" autoFocus />
          {fieldErrors?.desc ? <div className="gerr">{fieldErrors.desc[0]}</div> : null}
        </div>

        <div className="mrow">
          <div className="field">
            <label>Valor</label>
            <MoneyField name="amount" currency={currency} />
            {fieldErrors?.amount ? <div className="gerr">{fieldErrors.amount[0]}</div> : null}
          </div>
          <div className="field">
            <label>Data</label>
            <DateField name="date" defaultValue={isoDate(today())} />
          </div>
        </div>

        <div className="mrow">
          <div className="field">
            <label>Categoria</label>
            {isNew ? (
              <input name="cat" placeholder="Nova categoria" autoFocus />
            ) : (
              <Select value={catSel} onChange={(e) => setCatSel(e.target.value)} name="cat">
                <option value="">(escolha)</option>
                {cats.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={NEW}>+ Nova categoria…</option>
              </Select>
            )}
            {isNew ? (
              <button type="button" className="link" style={{ marginTop: 4 }} onClick={() => setCatSel("")}>← escolher da lista</button>
            ) : null}
            {fieldErrors?.cat ? <div className="gerr">{fieldErrors.cat[0]}</div> : null}
          </div>
          <div className="field">
            <label>Fundo</label>
            <Select name="fund" defaultValue={funds[0] ?? ""}>
              {funds.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
        </div>

        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}

        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
