"use client";

// Registrar doação (Client — Server Action). Doador = Stick (buscar), nome digitado
// ou anônimo; fundo (reusa funds), valor (máscara), método, data, nota. Se o país da
// org é US, mostra o alternador de bens/serviços em troca (quid pro quo). Fecha e
// recarrega no sucesso. Ver docs/handoffs/giving-fase1.md.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { MoneyField } from "@/components/shared/MoneyField";
import { DateField } from "@/components/shared/DateField";
import { createDonationAction } from "../actions";
import { DONATION_METHODS } from "../domain";
import type { Country, Donor, Fund } from "../types";
import { type ActionResult } from "@/lib/errors";
import { isoDate, today } from "@/lib/utils/date";

const INITIAL: ActionResult = { success: true, data: undefined };

type DonorMode = "stick" | "typed" | "anon";
const MODES: { key: DonorMode; label: string }[] = [
  { key: "stick", label: "Pessoa" },
  { key: "typed", label: "Nome avulso" },
  { key: "anon", label: "Anônimo" },
];

export function DonationModal({
  donors,
  funds,
  country,
  currency,
  onClose,
}: {
  donors: Donor[];
  funds: Fund[];
  country: Country;
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createDonationAction, INITIAL);
  const [mode, setMode] = useState<DonorMode>(donors.length > 0 ? "stick" : "typed");
  const [goods, setGoods] = useState(false);

  useEffect(() => {
    if (state.success && state !== INITIAL) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const fieldErrors = state.success ? undefined : state.fieldErrors;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" action={formAction}>
        <h3>Registrar doação</h3>
        <p className="msub">Contribuição atribuída a um doador, com recibo. Fica no ledger de giving (separado do Finance Lite).</p>

        <input type="hidden" name="donorMode" value={mode} />

        <div className="field">
          <label>Doador</label>
          <div className="filtchips">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`fchip${mode === m.key ? " on" : ""}`}
                onClick={() => setMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === "stick" ? (
            <Select name="stickId" defaultValue="">
              <option value="">Escolha a pessoa…</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          ) : null}
          {mode === "typed" ? (
            <input name="donorName" placeholder="Nome do doador" autoFocus />
          ) : null}
          {mode === "anon" ? <div className="muted">Doação sem identificação do doador.</div> : null}
          {fieldErrors?.donor ? <div className="gerr">{fieldErrors.donor[0]}</div> : null}
        </div>

        {country === "BR" && mode !== "anon" ? (
          <div className="field">
            <label>CPF do doador (opcional)</label>
            <input name="donorTaxId" placeholder="000.000.000-00" />
          </div>
        ) : null}

        <div className="mrow">
          <div className="field">
            <label>Valor</label>
            <MoneyField name="amount" currency={currency} />
            {fieldErrors?.amount ? <div className="gerr">{fieldErrors.amount[0]}</div> : null}
          </div>
          <div className="field">
            <label>Método</label>
            <Select name="method" defaultValue="dinheiro">
              {DONATION_METHODS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mrow">
          <div className="field">
            <label>Fundo</label>
            <Select name="fundId" defaultValue="">
              <option value="">Geral (sem fundo)</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label>Data</label>
            <DateField name="date" defaultValue={isoDate(today())} />
            {fieldErrors?.date ? <div className="gerr">{fieldErrors.date[0]}</div> : null}
          </div>
        </div>

        <div className="field">
          <label>Novo fundo (opcional)</label>
          <input name="newFundName" placeholder="Cria e designa a este fundo" />
        </div>

        <div className="field">
          <label>Nota (opcional)</label>
          <textarea name="note" rows={2} placeholder="Referência, envelope, observação…" />
        </div>

        {country === "US" ? (
          <div className="field">
            <label className="field check" style={{ marginBottom: goods ? 10 : 0 }}>
              <input type="checkbox" name="goodsProvided" value="1" checked={goods} onChange={(e) => setGoods(e.target.checked)} />
              <span>Houve bens/serviços em troca? (quid pro quo)</span>
            </label>
            {goods ? (
              <div className="mrow">
                <div className="field" style={{ flex: 2 }}>
                  <label>Descrição</label>
                  <input name="goodsDescription" placeholder="Ex.: jantar beneficente" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Valor estimado</label>
                  <MoneyField name="goodsValue" currency={currency} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}

        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Registrar"}</button>
        </div>
      </form>
    </div>
  );
}
