"use client";

// Novo lançamento (spec 10): Entrada · Saída · Transferência. Valor grande, categoria e
// conta, "De quem?" quando é dízimo/oferta. Validação inline; aviso (não bloqueio) se a
// saída deixa a conta negativa. Contas/categorias novas nascem aqui mesmo.
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { MoneyField } from "@/components/shared/MoneyField";
import { type ActionResult } from "@/lib/errors";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { createLedgerAccountAction, recordTransactionAction } from "../actions";
import { isGivingCategory, leafAccounts, type AccountBalance, type LedgerAccount, type TxKind } from "../domain";
import styles from "../finance.module.css";

const INITIAL: ActionResult<string> = { success: true, data: "" };
const NEW_OPTION = "__new__";
const LAST_ACCOUNT_KEY = "mercy.finance.lastAccount";
const MAX_SUGGESTIONS = 5;

const KIND_LABEL: Record<TxKind, string> = { in: "Entrada", out: "Saída", transfer: "Transferência" };
const MEMO_PLACEHOLDER: Record<TxKind, string> = {
  in: "Ex.: Ofertas do culto de domingo",
  out: "Ex.: Conta de luz de outubro",
  transfer: "Ex.: Depósito do caixa no banco",
};
const METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

function readLastAccount(): string {
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberAccount(id: string): void {
  try {
    window.localStorage.setItem(LAST_ACCOUNT_KEY, id);
  } catch {
    // sem storage (aba privada): só não lembra a última conta
  }
}

const normalize = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface TransactionFormProps {
  accounts: LedgerAccount[];
  balances: AccountBalance[];
  people: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  currency: string;
  initialKind?: TxKind;
  initialCounterId?: string;
  onSaved: (entryId: string) => void;
  onCancel: () => void;
}

export function TransactionForm(props: TransactionFormProps) {
  const { balances, people, funds, currency, onSaved, onCancel } = props;
  const [state, formAction, pending] = useActionState(recordTransactionAction, INITIAL);
  const [kind, setKind] = useState<TxKind>(props.initialKind ?? "in");
  const [created, setCreated] = useState<LedgerAccount[]>([]);
  const accounts = useMemo(() => {
    const ids = new Set(props.accounts.map((a) => a.id));
    return [...props.accounts, ...created.filter((a) => !ids.has(a.id))];
  }, [props.accounts, created]);

  const assets = leafAccounts(accounts, "asset");
  // Abre na conta padrão; sem padrão, na última usada (o painel só monta no cliente, então
  // ler storage aqui é seguro).
  const [accountId, setAccountId] = useState(() => {
    const preferred = assets.find((a) => a.isDefault)?.id;
    if (preferred) return preferred;
    const last = readLastAccount();
    return assets.some((a) => a.id === last) ? last : (assets[0]?.id ?? "");
  });
  const [counterId, setCounterId] = useState(props.initialCounterId ?? "");
  const [amount, setAmount] = useState<number | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Avisa uma vez por resultado (onSaved muda a cada render do pai).
  const handledState = useRef(INITIAL);
  useEffect(() => {
    if (state === handledState.current || !state.success || !state.data) return;
    handledState.current = state;
    rememberAccount(accountId);
    onSaved(state.data);
  }, [state, accountId, onSaved]);

  const counters =
    kind === "transfer" ? assets.filter((a) => a.id !== accountId) : leafAccounts(accounts, kind === "in" ? "revenue" : "expense");
  const counterName = accounts.find((a) => a.id === counterId)?.name ?? "";
  const isGiving = kind === "in" && isGivingCategory(counterName);
  const fieldErrors = state.success ? undefined : state.fieldErrors;

  const balance = balances.find((b) => b.id === accountId)?.balance ?? 0;
  const goesNegative = kind !== "in" && amount != null && amount > 0 && balance - amount < 0;
  const accountName = assets.find((a) => a.id === accountId)?.name ?? "";

  const switchKind = (k: TxKind): void => {
    setKind(k);
    setCounterId("");
  };

  return (
    <form className={styles.panelForm} action={formAction}>
      <input type="hidden" name="kind" value={kind} />
      <div className={styles.panelBody}>
        <div className={styles.kinds} role="tablist" aria-label="Tipo de lançamento">
          {(Object.keys(KIND_LABEL) as TxKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`${styles.kind} ${styles.press}${kind === k ? ` ${styles.on}` : ""}`}
              onClick={() => switchKind(k)}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <div className={styles.bigAmount}>
          <MoneyField name="amount" currency={currency} autoFocus onAmountChange={setAmount} />
          {fieldErrors?.amount ? <div className="gerr">{fieldErrors.amount[0]}</div> : null}
          {goesNegative ? (
            <div className={styles.warn}>
              Isso deixa {accountName} com saldo negativo ({money(balance - (amount ?? 0), currency)}).
            </div>
          ) : null}
        </div>

        <AccountPicker
          label={kind === "transfer" ? "Para" : "Categoria"}
          name="counterId"
          kindForNew={kind}
          options={counters}
          value={counterId}
          onChange={setCounterId}
          onCreated={(a) => setCreated((c) => [...c, a])}
          error={fieldErrors?.counterId?.[0]}
        />

        <AccountPicker
          label={kind === "transfer" ? "De" : kind === "in" ? "Entrou em" : "Saiu de"}
          name="accountId"
          kindForNew="transfer"
          options={assets}
          value={accountId}
          onChange={setAccountId}
          onCreated={(a) => setCreated((c) => [...c, a])}
          error={fieldErrors?.accountId?.[0]}
        />

        {isGiving ? <DonorFields people={people} /> : null}

        <div className="field">
          <label htmlFor="tx-date">Data</label>
          <DateField id="tx-date" name="date" defaultValue={isoDate(today())} />
          {fieldErrors?.date ? <div className="gerr">{fieldErrors.date[0]}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="tx-memo">Descrição</label>
          <input id="tx-memo" name="memo" placeholder={MEMO_PLACEHOLDER[kind]} autoComplete="off" />
        </div>

        {funds.length > 0 ? (
          <div className={styles.more}>
            {isMoreOpen ? (
              <div className="field">
                <label htmlFor="tx-fund">Fundo designado</label>
                <Select id="tx-fund" name="fundId" defaultValue="">
                  <option value="">Nenhum (geral)</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <button type="button" className="link" onClick={() => setIsMoreOpen(true)}>
                Mais opções
              </button>
            )}
          </div>
        ) : null}

        {!state.success && state.message ? <div className="gerr">{state.message}</div> : null}
      </div>

      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className={`btn ${styles.press}`} type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function AccountPicker({
  label,
  name,
  kindForNew,
  options,
  value,
  onChange,
  onCreated,
  error,
}: {
  label: string;
  name: string;
  kindForNew: TxKind;
  options: LedgerAccount[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (a: LedgerAccount) => void;
  error?: string;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const id = `tx-${name}`;
  const newLabel = kindForNew === "transfer" ? "+ Nova conta…" : "+ Nova categoria…";
  const newType = kindForNew === "in" ? "revenue" : kindForNew === "out" ? "expense" : "asset";

  const create = (): void => {
    startSaving(async () => {
      const res = await createLedgerAccountAction(kindForNew, newName);
      if (!res.success) {
        setCreateError(res.message);
        return;
      }
      onCreated({ id: res.data.id, name: res.data.name, code: "~", type: newType, parentId: null, isActive: true, bankCode: null, isDefault: false });
      onChange(res.data.id);
      setIsCreating(false);
      setNewName("");
      setCreateError("");
    });
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={value} />
      {isCreating ? (
        <>
          <div className={styles.newInline}>
            <input
              id={id}
              autoFocus
              value={newName}
              placeholder={kindForNew === "transfer" ? "Ex.: Banco do Brasil" : "Ex.: Material de limpeza"}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
            />
            <button type="button" className={`btn sm ${styles.press}`} disabled={isSaving || !newName.trim()} onClick={create}>
              {isSaving ? "Criando…" : "Criar"}
            </button>
          </div>
          <button type="button" className="link" style={{ marginTop: 4 }} onClick={() => setIsCreating(false)}>
            Escolher da lista
          </button>
          {createError ? <div className="gerr">{createError}</div> : null}
        </>
      ) : (
        <Select
          id={id}
          value={value}
          onChange={(e) => (e.target.value === NEW_OPTION ? setIsCreating(true) : onChange(e.target.value))}
        >
          <option value="">Escolha…</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
          <option value={NEW_OPTION}>{newLabel}</option>
        </Select>
      )}
      {error ? <div className="gerr">{error}</div> : null}
    </div>
  );
}

function DonorFields({ people }: { people: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [stickId, setStickId] = useState("");
  const q = normalize(query.trim());
  const suggestions = q && !stickId ? people.filter((p) => normalize(p.name).includes(q)).slice(0, MAX_SUGGESTIONS) : [];

  return (
    <div className="mrow">
      <div className="field" style={{ flex: 2 }}>
        <label htmlFor="tx-donor">De quem? (opcional)</label>
        <input
          id="tx-donor"
          value={query}
          autoComplete="off"
          placeholder="Nome da pessoa"
          onChange={(e) => {
            setQuery(e.target.value);
            setStickId("");
          }}
        />
        <input type="hidden" name="donorStickId" value={stickId} />
        <input type="hidden" name="donorName" value={stickId ? "" : query.trim()} />
        {suggestions.length > 0 ? (
          <ul className={styles.suggest}>
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setStickId(p.id);
                    setQuery(p.name);
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {query.trim() && !stickId ? <div className={styles.hint}>Sem cadastro: o nome vai só no recibo.</div> : null}
      </div>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor="tx-method">Forma</label>
        <Select id="tx-method" name="method" defaultValue="pix">
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
