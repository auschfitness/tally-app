"use client";

// Gerenciar contas (spec 11, fase A), dentro do painel de Finanças: lista com estrela de
// conta padrão → grade de bancos com logo → nome livre + saldo inicial. Editar reaproveita
// o formulário; desativar só com saldo zero (o servidor confere).
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { MoneyField } from "@/components/shared/MoneyField";
import { DateField } from "@/components/shared/DateField";
import { money } from "@/lib/utils/money";
import { isoDate, today } from "@/lib/utils/date";
import { BANKS, bankByCode, CASH_CODE, OTHER_BANK_CODE } from "../banks";
import { deactivateAccountAction, saveBankAccountAction, setDefaultAccountAction } from "../actions";
import { leafAccounts, type AccountBalance, type LedgerAccount, type Movement } from "../domain";
import { BankLogo } from "./BankLogo";
import styles from "../finance.module.css";

type View = { mode: "list" } | { mode: "pick"; editingId: string | null } | { mode: "form"; editingId: string | null; bankCode: string };

const normalize = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function bankLabel(code: string): string {
  if (code === CASH_CODE) return "Dinheiro (caixa físico)";
  if (code === OTHER_BANK_CODE) return "Outro banco";
  return bankByCode(code)?.name ?? "Banco";
}

export function AccountsManager({
  accounts,
  balances,
  movements,
  currency,
  onClose,
}: {
  accounts: LedgerAccount[];
  balances: AccountBalance[];
  movements: Movement[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>({ mode: "list" });
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const assets = leafAccounts(accounts, "asset");
  const balanceOf = (id: string): number => balances.find((b) => b.id === id)?.balance ?? 0;

  const toggleDefault = (a: LedgerAccount): void => {
    setError("");
    startSaving(async () => {
      const res = await setDefaultAccountAction(a.isDefault ? null : a.id);
      if (res.success) router.refresh();
      else setError(res.message);
    });
  };

  if (view.mode === "pick") {
    return (
      <BankPicker
        onPick={(bankCode) => setView({ mode: "form", editingId: view.editingId, bankCode })}
        onBack={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "form") {
    const editing = view.editingId ? assets.find((a) => a.id === view.editingId) : undefined;
    const opening = editing ? movements.find((m) => m.kind === "opening" && m.status === "posted" && m.accountId === editing.id) : undefined;
    return (
      <AccountForm
        key={`${view.editingId ?? "new"}-${view.bankCode}`}
        bankCode={view.bankCode}
        editing={editing}
        openingAmount={opening?.amount ?? 0}
        openingDate={opening?.date ?? isoDate(today())}
        isFirst={assets.length === 0}
        currency={currency}
        onChangeBank={() => setView({ mode: "pick", editingId: view.editingId })}
        onDone={() => {
          router.refresh();
          setView({ mode: "list" });
        }}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        {assets.length === 0 ? <p className="muted">Nenhuma conta ainda. Adicione a conta do banco da igreja.</p> : null}
        {assets.map((a) => (
          <div key={a.id} className={styles.accountRow}>
            <BankLogo bankCode={a.bankCode} />
            <button
              type="button"
              className={`${styles.rowMain} ${styles.rowButton}`}
              onClick={() => setView({ mode: "form", editingId: a.id, bankCode: a.bankCode ?? OTHER_BANK_CODE })}
            >
              <div className={styles.rowTitle}>{a.name}</div>
              <div className={styles.rowSub}>
                {money(balanceOf(a.id), currency)}
                {a.isDefault ? " · conta padrão" : ""}
              </div>
            </button>
            <button
              type="button"
              className={`${styles.star} ${styles.press}${a.isDefault ? ` ${styles.on}` : ""}`}
              aria-pressed={a.isDefault}
              aria-label={a.isDefault ? `Tirar ${a.name} como padrão` : `Usar ${a.name} como padrão`}
              title={a.isDefault ? "Conta padrão" : "Usar como padrão"}
              disabled={isSaving}
              onClick={() => toggleDefault(a)}
            >
              <Star />
            </button>
          </div>
        ))}
        {error ? <div className="gerr">{error}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onClose}>
          Fechar
        </button>
        <button className={`btn ${styles.press}`} type="button" onClick={() => setView({ mode: "pick", editingId: null })}>
          Nova conta
        </button>
      </div>
    </div>
  );
}

function BankPicker({ onPick, onBack }: { onPick: (bankCode: string) => void; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());
  const banks = useMemo(() => (q ? BANKS.filter((b) => normalize(b.name).includes(q)) : BANKS), [q]);

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <input
          className="searchbox"
          type="search"
          autoFocus
          placeholder="Buscar banco"
          aria-label="Buscar banco"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.bankGrid}>
          {banks.map((b) => (
            <button key={b.code} type="button" className={`${styles.bankTile} ${styles.press}`} onClick={() => onPick(b.code)}>
              <BankLogo bankCode={b.code} />
              {b.name}
            </button>
          ))}
          <button type="button" className={`${styles.bankTile} ${styles.press}`} onClick={() => onPick(CASH_CODE)}>
            <BankLogo bankCode={CASH_CODE} />
            Dinheiro
          </button>
          <button type="button" className={`${styles.bankTile} ${styles.press}`} onClick={() => onPick(OTHER_BANK_CODE)}>
            <BankLogo bankCode={OTHER_BANK_CODE} />
            Outro banco
          </button>
        </div>
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

function AccountForm({
  bankCode,
  editing,
  openingAmount,
  openingDate,
  isFirst,
  currency,
  onChangeBank,
  onDone,
  onCancel,
}: {
  bankCode: string;
  editing: LedgerAccount | undefined;
  openingAmount: number;
  openingDate: string;
  isFirst: boolean;
  currency: string;
  onChangeBank: () => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? (bankCode === CASH_CODE ? "Caixa" : bankByCode(bankCode)?.name ?? ""));
  const [opening, setOpening] = useState<number | null>(openingAmount || null);
  const [date, setDate] = useState(openingDate);
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? isFirst);
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [isArmed, setIsArmed] = useState(false);

  const save = (): void => {
    setError("");
    startSaving(async () => {
      const res = await saveBankAccountAction({
        id: editing?.id ?? null,
        bankCode,
        name,
        openingBalance: opening ?? 0,
        openingDate: date,
        isDefault,
      });
      if (res.success) onDone();
      else setError(res.message);
    });
  };

  const deactivate = (): void => {
    if (!editing) return;
    if (!isArmed) {
      setIsArmed(true);
      return;
    }
    startSaving(async () => {
      const res = await deactivateAccountAction(editing.id);
      if (res.success) onDone();
      else {
        setError(res.message);
        setIsArmed(false);
      }
    });
  };

  return (
    <form
      className={styles.panelForm}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={styles.panelBody}>
        <div className={styles.bankHead}>
          <BankLogo bankCode={bankCode} />
          <div className={styles.rowMain}>
            <div className={styles.rowTitle}>{bankLabel(bankCode)}</div>
            <button type="button" className="link" onClick={onChangeBank}>
              Trocar banco
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="acc-name">Nome da conta</label>
          <input id="acc-name" value={name} autoFocus autoComplete="off" placeholder="Ex.: Itaú da igreja" onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mrow">
          <div className="field">
            <label htmlFor="acc-opening">Saldo inicial</label>
            <MoneyField id="acc-opening" name="opening" currency={currency} defaultValue={openingAmount > 0 ? openingAmount : undefined} onAmountChange={setOpening} />
          </div>
          <div className="field">
            <label htmlFor="acc-date">Em</label>
            <DateField id="acc-date" value={date} onChange={setDate} />
          </div>
        </div>
        <p className={styles.hint}>Quanto havia na conta nesse dia. Os lançamentos depois dele contam a partir daí.</p>

        <div className={`field check ${styles.checkRow}`}>
          <input id="acc-default" type="checkbox" className={styles.check} checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          <label htmlFor="acc-default">Usar como conta padrão</label>
        </div>

        {editing ? (
          <button type="button" className={`link ${styles.dangerLink}`} disabled={isSaving} onClick={deactivate}>
            {isArmed ? "Toque de novo para desativar" : "Desativar conta"}
          </button>
        ) : null}
        {error ? <div className="gerr">{error}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className={`btn ${styles.press}`} type="submit" disabled={isSaving || !name.trim()}>
          {isSaving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
