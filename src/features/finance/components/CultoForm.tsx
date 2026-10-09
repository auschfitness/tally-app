"use client";

// Lançar culto: os envelopes de dízimo numa lista estilo planilha (nome, Tab, valor, Enter
// e já está na próxima linha) e as ofertas soltas num campo só. O nome completa com as
// pessoas cadastradas; quem não está cadastrado entra pelo nome mesmo. Um Salvar para tudo.
import { useMemo, useRef, useState, useTransition } from "react";
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { money, parseMoneyInput } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { recordCultoAction } from "../actions";
import { CASH_CODE } from "../banks";
import { leafAccounts, type LedgerAccount } from "../domain";
import styles from "../finance.module.css";

const METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cheque", label: "Cheque" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
];

const normalize = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Na lista, "150" é R$ 150 (ninguém dá dízimo em centavos); com vírgula, vale a vírgula.
export function parseCultoAmount(raw: string, currency: string): number {
  const t = raw.trim();
  if (/^\d+$/.test(t)) return Number(t);
  return parseMoneyInput(t, currency) ?? 0;
}

function lastSunday(): string {
  const d = today();
  d.setDate(d.getDate() - d.getDay());
  return isoDate(d);
}

interface Row {
  key: number;
  name: string;
  amount: string;
}

export function CultoForm({
  accounts,
  people,
  preferredAccountId,
  titheCategoryId,
  offeringCategoryId,
  currency,
  onSaved,
  onCancel,
}: {
  accounts: LedgerAccount[];
  people: { id: string; name: string }[];
  preferredAccountId: string;
  titheCategoryId: string;
  offeringCategoryId: string | null;
  currency: string;
  onSaved: (entryIds: string[], message: string) => void;
  onCancel: () => void;
}) {
  const assets = leafAccounts(accounts, "asset");
  const [date, setDate] = useState(lastSunday);
  const [accountId, setAccountId] = useState(() => assets.find((a) => a.bankCode === CASH_CODE)?.id ?? preferredAccountId);
  const [method, setMethod] = useState("dinheiro");
  const [rows, setRows] = useState<Row[]>([{ key: 1, name: "", amount: "" }]);
  const [offering, setOffering] = useState("");
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const nextKey = useRef(2);
  const body = useRef<HTMLDivElement>(null);

  const personByName = useMemo(() => new Map(people.map((p) => [normalize(p.name), p])), [people]);
  const tithes = rows
    .map((r) => {
      const person = personByName.get(normalize(r.name));
      return { stickId: person?.id ?? null, name: person?.name ?? r.name.trim(), amount: parseCultoAmount(r.amount, currency) };
    })
    .filter((t) => t.amount > 0);
  const offeringValue = parseCultoAmount(offering, currency);
  const total = tithes.reduce((s, t) => s + t.amount, 0) + offeringValue;
  const count = tithes.length + (offeringValue > 0 ? 1 : 0);

  const update = (key: number, patch: Partial<Row>): void => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const focusName = (key: number): void => {
    requestAnimationFrame(() => body.current?.querySelector<HTMLInputElement>(`[data-name="${key}"]`)?.focus());
  };
  // Enter no valor: vai para a linha de baixo (cria uma se for a última).
  const nextRow = (key: number): void => {
    const i = rows.findIndex((r) => r.key === key);
    const below = rows[i + 1];
    if (below) {
      focusName(below.key);
      return;
    }
    const k = nextKey.current++;
    setRows((rs) => [...rs, { key: k, name: "", amount: "" }]);
    focusName(k);
  };
  const remove = (key: number): void => setRows((rs) => (rs.length === 1 ? [{ key: nextKey.current++, name: "", amount: "" }] : rs.filter((r) => r.key !== key)));

  const save = (): void => {
    setError("");
    startSaving(async () => {
      const res = await recordCultoAction({ date, accountId, titheCategoryId, offeringCategoryId, method, tithes, offering: offeringValue });
      if (!res.success) {
        setError(res.message);
        return;
      }
      if (res.data.failed > 0) {
        setError(`${res.data.entryIds.length} lançados, ${res.data.failed} com problema: ${res.data.lastError}`);
        return;
      }
      onSaved(res.data.entryIds, `Culto lançado: ${money(total, currency)}`);
    });
  };

  return (
    <form
      className={styles.panelForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (count > 0) save();
      }}
    >
      <div className={styles.panelBody} ref={body}>
        <div className="mrow">
          <div className="field">
            <label htmlFor="culto-date">Data do culto</label>
            <DateField id="culto-date" value={date} onChange={setDate} />
          </div>
          <div className="field">
            <label htmlFor="culto-method">Forma</label>
            <Select id="culto-method" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="culto-account">Entrou em</label>
          <Select id="culto-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        <div className={styles.cultoHead}>
          <span>Dízimos</span>
          <span className={styles.hint}>Nome, Tab, valor, Enter</span>
        </div>
        <datalist id="culto-people">
          {people.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        {rows.map((r, i) => {
          const known = r.name.trim() !== "" && personByName.has(normalize(r.name));
          return (
            <div key={r.key} className={`field ${styles.cultoRow}`}>
              <input
                data-name={r.key}
                list="culto-people"
                autoComplete="off"
                autoFocus={i === 0}
                placeholder="Nome"
                aria-label={`Nome, linha ${i + 1}`}
                value={r.name}
                onChange={(e) => update(r.key, { name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget.nextElementSibling as HTMLInputElement | null)?.focus();
                  }
                }}
                className={known ? styles.cultoKnown : undefined}
              />
              <input
                inputMode="decimal"
                autoComplete="off"
                placeholder="Valor"
                aria-label={`Valor, linha ${i + 1}`}
                value={r.amount}
                onChange={(e) => update(r.key, { amount: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    nextRow(r.key);
                  }
                }}
              />
              <button type="button" className={styles.cultoDel} aria-label={`Tirar linha ${i + 1}`} onClick={() => remove(r.key)}>
                ×
              </button>
            </div>
          );
        })}
        <button type="button" className={`link ${styles.cultoAdd}`} onClick={() => nextRow(rows[rows.length - 1]?.key ?? 0)}>
          + Outra pessoa
        </button>

        <div className={`field ${styles.cultoOffering}`}>
          <label htmlFor="culto-offering">Ofertas soltas (sem nome)</label>
          <input id="culto-offering" inputMode="decimal" autoComplete="off" placeholder="Valor" value={offering} onChange={(e) => setOffering(e.target.value)} />
        </div>

        {error ? <div className="gerr">{error}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className={`btn ${styles.press}`} type="submit" disabled={isSaving || count === 0 || !accountId}>
          {isSaving ? "Lançando…" : count === 0 ? "Lançar" : `Lançar ${money(total, currency)}`}
        </button>
      </div>
    </form>
  );
}
