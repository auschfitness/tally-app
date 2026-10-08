"use client";

// Classificar o extrato (spec 11, fase C), estilo Controlle: fila das linhas pendentes, mais
// antigas primeiro, com a categoria sugerida pelas regras. Escolher a categoria marca a
// linha; classificar em lote cria os lançamentos. Linha que parece já lançada à mão oferece
// "Vincular" em vez de duplicar. No fim, as escolhas feitas à mão viram oferta de regra.
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { brDate } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import { classifyLinesAction, ignoreLinesAction, linkLineAction, listPendingAction, saveRulesAction, type PendingData } from "../import-actions";
import { findManualMatch, guessRulePattern, leafAccounts, suggestCategory, type BankLine, type LedgerAccount, type Movement } from "../domain";
import styles from "../finance.module.css";

const MAX_RULE_OFFERS = 5;

interface RuleOffer {
  key: string;
  pattern: string;
  counterId: string;
  isEnabled: boolean;
}

export function ClassifyPanel({
  accounts,
  movements,
  currency,
  onClose,
}: {
  accounts: LedgerAccount[];
  movements: Movement[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<PendingData | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [offers, setOffers] = useState<RuleOffer[] | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, startSaving] = useTransition();

  const nameOf = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const revenue = leafAccounts(accounts, "revenue");
  const expense = leafAccounts(accounts, "expense");

  const load = useCallback(async () => {
    const res = await listPendingAction();
    if (!res.success) {
      setMessage(res.message);
      return;
    }
    const suggested: Record<string, string> = {};
    for (const line of res.data.lines) {
      const s = suggestCategory(line, res.data.rules, accounts);
      if (s) suggested[line.id] = s;
    }
    setData(res.data);
    setChoice(suggested);
    setChecked(new Set(Object.keys(suggested)));
  }, [accounts]);

  useEffect(() => {
    void load();
  }, [load]);

  const linked = useMemo(() => new Set(data?.linkedEntryIds ?? []), [data]);
  const suggestions = useMemo(() => {
    const m = new Map<string, string>();
    for (const line of data?.lines ?? []) {
      const s = suggestCategory(line, data?.rules ?? [], accounts);
      if (s) m.set(line.id, s);
    }
    return m;
  }, [data, accounts]);

  const pick = (line: BankLine, counterId: string): void => {
    setChoice((c) => ({ ...c, [line.id]: counterId }));
    setChecked((s) => {
      const next = new Set(s);
      if (counterId) next.add(line.id);
      else next.delete(line.id);
      return next;
    });
  };

  const toggle = (id: string): void =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selected = (data?.lines ?? []).filter((l) => checked.has(l.id));
  const ready = selected.filter((l) => choice[l.id]);

  const classify = (): void => {
    setMessage("");
    startSaving(async () => {
      const res = await classifyLinesAction(ready.map((l) => ({ id: l.id, counterId: choice[l.id] ?? "" })));
      if (!res.success) {
        setMessage(res.message);
        return;
      }
      setMessage(res.data.failed > 0 ? `${res.data.done} classificados, ${res.data.failed} com problema: ${res.data.lastError}` : "");
      const manual = ready.filter((l) => choice[l.id] !== suggestions.get(l.id));
      const seen = new Set<string>();
      const nextOffers: RuleOffer[] = [];
      for (const l of manual) {
        const pattern = guessRulePattern(l.description);
        if (!pattern || seen.has(pattern) || nextOffers.length >= MAX_RULE_OFFERS) continue;
        seen.add(pattern);
        nextOffers.push({ key: l.id, pattern, counterId: choice[l.id] ?? "", isEnabled: true });
      }
      router.refresh();
      await load();
      if (nextOffers.length > 0) setOffers(nextOffers);
    });
  };

  const ignore = (): void => {
    startSaving(async () => {
      const res = await ignoreLinesAction(selected.map((l) => l.id));
      if (!res.success) setMessage(res.message);
      router.refresh();
      await load();
    });
  };

  const link = (lineId: string, entryId: string): void => {
    startSaving(async () => {
      const res = await linkLineAction(lineId, entryId);
      if (!res.success) setMessage(res.message);
      router.refresh();
      await load();
    });
  };

  if (offers) {
    return (
      <RuleOffers
        offers={offers}
        nameOf={nameOf}
        onChange={setOffers}
        onSkip={() => setOffers(null)}
        onSave={() =>
          startSaving(async () => {
            const res = await saveRulesAction(offers.filter((o) => o.isEnabled).map((o) => ({ pattern: o.pattern, counterId: o.counterId })));
            if (!res.success) setMessage(res.message);
            setOffers(null);
            await load();
          })
        }
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        {data == null ? <p className="muted">Carregando…</p> : null}
        {data && data.lines.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Tudo classificado</div>
            <p>Quando importar o próximo extrato, as linhas novas aparecem aqui.</p>
          </div>
        ) : null}
        {data?.lines.map((line) => {
          const match = findManualMatch(line, movements, linked);
          const options = line.amount > 0 ? revenue : expense;
          return (
            <div key={line.id} className={styles.classifyRow}>
              <div className={styles.classifyTop}>
                <input type="checkbox" className={styles.check} aria-label={`Selecionar ${line.description}`} checked={checked.has(line.id)} onChange={() => toggle(line.id)} />
                <span className={styles.rowTitle}>
                  {brDate(line.date)} · {line.description || "Sem descrição"}
                </span>
                <b className={`${styles.amount}${line.amount > 0 ? ` ${styles.in}` : ""}`}>
                  {line.amount > 0 ? "+" : "−"}
                  {money(Math.abs(line.amount), currency)}
                </b>
              </div>
              <div className={styles.classifyPick}>
                <Select compact aria-label="Categoria" value={choice[line.id] ?? ""} onChange={(e) => pick(line, e.target.value)}>
                  <option value="">Escolha a categoria…</option>
                  {options.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
                {suggestions.has(line.id) && choice[line.id] === suggestions.get(line.id) ? <span className={styles.hint}>sugerida</span> : null}
              </div>
              {match ? (
                <div className={styles.matchHint}>
                  Parece já lançado: {match.memo || nameOf.get(match.counterId ?? "") || "lançamento"} em {brDate(match.date)}.
                  <button type="button" className="link" disabled={isSaving} onClick={() => link(line.id, match.id)}>
                    Vincular
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        {message ? <div className="gerr">{message}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        {selected.length > 0 ? (
          <button className={`btn ghost ${styles.press}`} type="button" disabled={isSaving} onClick={ignore}>
            Ignorar ({selected.length})
          </button>
        ) : (
          <button className={`btn ghost ${styles.press}`} type="button" onClick={onClose}>
            Fechar
          </button>
        )}
        <button className={`btn ${styles.press}`} type="button" disabled={isSaving || ready.length === 0} onClick={classify}>
          {isSaving ? "Salvando…" : `Classificar (${ready.length})`}
        </button>
      </div>
    </div>
  );
}

function RuleOffers({
  offers,
  nameOf,
  onChange,
  onSkip,
  onSave,
  isSaving,
}: {
  offers: RuleOffer[];
  nameOf: Map<string, string>;
  onChange: (offers: RuleOffer[]) => void;
  onSkip: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const update = (key: string, patch: Partial<RuleOffer>): void => onChange(offers.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <div className={styles.emptyTitle}>Lembrar para as próximas?</div>
        <p className="muted">Da próxima vez que estes textos aparecerem no extrato, a categoria já vem escolhida.</p>
        {offers.map((o) => (
          <div key={o.key} className={styles.ruleOffer}>
            <input type="checkbox" className={styles.check} aria-label="Criar esta regra" checked={o.isEnabled} onChange={(e) => update(o.key, { isEnabled: e.target.checked })} />
            <span>Sempre que aparecer</span>
            <input className={styles.ruleInput} aria-label="Texto da regra" value={o.pattern} onChange={(e) => update(o.key, { pattern: e.target.value })} />
            <span>
              usar <b>{nameOf.get(o.counterId) ?? ""}</b>
            </span>
          </div>
        ))}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onSkip}>
          Agora não
        </button>
        <button className={`btn ${styles.press}`} type="button" disabled={isSaving} onClick={onSave}>
          Salvar regras
        </button>
      </div>
    </div>
  );
}
