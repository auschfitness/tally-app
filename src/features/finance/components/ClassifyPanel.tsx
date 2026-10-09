"use client";

// Classificar o extrato (spec 11, fase C), estilo Controlle. Cada linha já vem com a
// categoria sugerida e o porquê (regra, histórico ou empresa conhecida). Escolheu a
// categoria de algo novo? Um toque em "Sempre" lembra para as próximas; tocar de novo
// ("✓ Sempre") esquece. "Regras" lista tudo que foi lembrado, com Esquecer em cada uma.
// Linha que parece uma conta aberta (spec 12, fase D) oferece pagar a conta com ela.
// PIX recebido com nome, classificado como dízimo/oferta, vira contribuição da pessoa.
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { brDate } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import { classifyLinesAction, forgetRuleAction, ignoreLinesAction, linkLineAction, listPendingAction, payBillFromLineAction, rememberRuleAction, type PendingData } from "../import-actions";
import { cleanMemo, donorFromLine, type LineDonor } from "../bankText";
import { findManualMatch, isGivingCategory, leafAccounts, type BankLine, type CategoryRule, type LedgerAccount, type Movement } from "../domain";
import { findBillMatch, type Bill } from "../bills";
import { suggestFor, type Suggestion } from "../suggest";
import styles from "../finance.module.css";

export function ClassifyPanel({
  accounts,
  movements,
  bills,
  people,
  currency,
  onClose,
}: {
  accounts: LedgerAccount[];
  movements: Movement[];
  bills: Bill[];
  people: { id: string; name: string }[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<PendingData | null>(null);
  const [manual, setManual] = useState<Record<string, string>>({}); // escolhas feitas à mão
  const [toggled, setToggled] = useState<Record<string, boolean>>({}); // marcações feitas à mão
  const [isShowingRules, setIsShowingRules] = useState(false);
  const [notPerson, setNotPerson] = useState<Record<string, boolean>>({}); // "Não é pessoa"
  const [message, setMessage] = useState("");
  const [isSaving, startSaving] = useTransition();

  const nameOf = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const revenue = useMemo(() => leafAccounts(accounts, "revenue"), [accounts]);
  const expense = leafAccounts(accounts, "expense");

  const load = useCallback(async () => {
    const res = await listPendingAction();
    if (!res.success) {
      setMessage(res.message);
      return;
    }
    setData(res.data);
    setManual({});
    setToggled({});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const linked = useMemo(() => new Set(data?.linkedEntryIds ?? []), [data]);
  const donors = useMemo(() => {
    const m = new Map<string, LineDonor>();
    for (const line of data?.lines ?? []) {
      const d = donorFromLine(line, people);
      if (d) m.set(line.id, d);
    }
    return m;
  }, [data, people]);
  // PIX recebido de uma pessoa, sem outra pista: o mais provável é dízimo.
  const titheId = useMemo(() => revenue.find((a) => /d[ií]zimo/i.test(a.name))?.id, [revenue]);
  const suggestions = useMemo(() => {
    const m = new Map<string, Suggestion>();
    for (const line of data?.lines ?? []) {
      const s = suggestFor(line, data?.rules ?? [], data?.history ?? [], accounts);
      if (s) m.set(line.id, s);
      else if (titheId && donors.has(line.id)) m.set(line.id, { accountId: titheId, source: "known", reason: "Entrada de uma pessoa: parece dízimo" });
    }
    return m;
  }, [data, accounts, donors, titheId]);

  // Uma conta é oferecida a uma linha só (a primeira da fila que bate com ela).
  const billMatches = useMemo(() => {
    const taken = new Set<string>();
    const m = new Map<string, Bill>();
    for (const line of data?.lines ?? []) {
      const b = findBillMatch(line, bills, taken);
      if (b) {
        taken.add(b.id);
        m.set(line.id, b);
      }
    }
    return m;
  }, [data, bills]);

  const givingIds = useMemo(() => new Set(accounts.filter((a) => a.type === "revenue" && isGivingCategory(a.name)).map((a) => a.id)), [accounts]);
  const donorOf = (id: string): LineDonor | undefined => (notPerson[id] || !givingIds.has(choiceOf(id)) ? undefined : donors.get(id));

  const choiceOf = (id: string): string => manual[id] ?? suggestions.get(id)?.accountId ?? "";
  // Linha que bate com uma conta vem desmarcada: o caminho é "Sim, pagar", não lançar de novo.
  const isChecked = (id: string): boolean => toggled[id] ?? (Boolean(choiceOf(id)) && !billMatches.has(id));

  const pick = (line: BankLine, counterId: string): void => {
    setManual((m) => ({ ...m, [line.id]: counterId }));
    setToggled((t) => ({ ...t, [line.id]: Boolean(counterId) }));
  };

  const setRules = (rules: CategoryRule[]): void => setData((d) => (d ? { ...d, rules } : d));

  // "Sempre": a regra vale na hora para as outras linhas iguais da fila (as que a pessoa não
  // escolheu à mão), porque a sugestão é recalculada a partir das regras.
  const remember = (line: BankLine, counterId: string): void => {
    setMessage("");
    startSaving(async () => {
      const res = await rememberRuleAction(line.description, counterId);
      if (!res.success) {
        setMessage(res.message);
        return;
      }
      setRules([...(data?.rules ?? []).filter((r) => r.pattern !== res.data.pattern), res.data]);
      setManual((m) => {
        const next = { ...m };
        delete next[line.id];
        return next;
      });
    });
  };

  // Esquecer não apaga a escolha da linha tocada: ela só deixa de ser automática.
  const forget = (ruleId: string, keep?: { lineId: string; counterId: string }): void => {
    setMessage("");
    if (keep) setManual((m) => ({ ...m, [keep.lineId]: keep.counterId }));
    startSaving(async () => {
      const res = await forgetRuleAction(ruleId);
      if (!res.success) {
        setMessage(res.message);
        return;
      }
      setRules((data?.rules ?? []).filter((r) => r.id !== ruleId));
    });
  };

  const lines = data?.lines ?? [];
  const selected = lines.filter((l) => isChecked(l.id));
  const ready = selected.filter((l) => choiceOf(l.id));

  const classify = (): void => {
    setMessage("");
    startSaving(async () => {
      const res = await classifyLinesAction(
        ready.map((l) => {
          const d = donorOf(l.id);
          return { id: l.id, counterId: choiceOf(l.id), donorStickId: d?.stickId ?? null, donorName: d && !d.stickId ? d.name : null };
        }),
      );
      if (!res.success) {
        setMessage(res.message);
        return;
      }
      if (res.data.failed > 0) setMessage(`${res.data.done} classificados, ${res.data.failed} com problema: ${res.data.lastError}`);
      router.refresh();
      await load();
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

  const payBill = (lineId: string, billId: string): void => {
    startSaving(async () => {
      const res = await payBillFromLineAction(lineId, billId);
      if (!res.success) setMessage(res.message);
      router.refresh();
      await load();
    });
  };

  if (isShowingRules) {
    return <RulesList rules={data?.rules ?? []} nameOf={nameOf} isSaving={isSaving} onForget={(id) => forget(id)} onBack={() => setIsShowingRules(false)} />;
  }

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        {data && data.rules.length > 0 ? (
          <button type="button" className={`link ${styles.rulesLink}`} onClick={() => setIsShowingRules(true)}>
            Regras ({data.rules.length})
          </button>
        ) : null}
        {data == null ? <p className="muted">Carregando…</p> : null}
        {data && lines.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Tudo classificado</div>
            <p>Quando importar o próximo extrato, as linhas novas aparecem aqui.</p>
          </div>
        ) : null}
        {lines.map((line) => {
          const suggestion = suggestions.get(line.id);
          const choice = choiceOf(line.id);
          const ruleOn = suggestion?.source === "rule" && suggestion.accountId === choice ? suggestion : null;
          const bill = billMatches.get(line.id);
          const match = bill ? null : findManualMatch(line, movements, linked);
          return (
            <div key={line.id} className={styles.classifyRow}>
              <div className={styles.classifyTop}>
                <input
                  type="checkbox"
                  className={styles.check}
                  aria-label={`Selecionar ${line.description}`}
                  checked={isChecked(line.id)}
                  onChange={() => setToggled((t) => ({ ...t, [line.id]: !isChecked(line.id) }))}
                />
                <span className={styles.rowTitle}>
                  {brDate(line.date)} · <span title={line.description}>{cleanMemo(line.description) || "Sem descrição"}</span>
                </span>
                <b className={`${styles.amount}${line.amount > 0 ? ` ${styles.in}` : ""}`}>
                  {line.amount > 0 ? "+" : "−"}
                  {money(Math.abs(line.amount), currency)}
                </b>
              </div>
              <div className={styles.classifyPick}>
                <Select compact aria-label="Categoria" value={choice} onChange={(e) => pick(line, e.target.value)}>
                  <option value="">Escolha a categoria…</option>
                  {(line.amount > 0 ? revenue : expense).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
                {choice ? (
                  <button
                    type="button"
                    className={`${styles.always}${ruleOn ? ` ${styles.on}` : ""}`}
                    aria-pressed={Boolean(ruleOn)}
                    title={ruleOn ? "Tocar para esquecer" : "Usar sempre esta categoria para este favorecido"}
                    disabled={isSaving}
                    onClick={() => (ruleOn?.ruleId ? forget(ruleOn.ruleId, { lineId: line.id, counterId: choice }) : remember(line, choice))}
                  >
                    <span key={ruleOn ? "on" : "off"} className={styles.alwaysLabel}>
                      {ruleOn ? "✓ Sempre" : "Sempre"}
                    </span>
                  </button>
                ) : null}
              </div>
              {suggestion && suggestion.accountId === choice ? <div className={styles.reason}>{suggestion.reason}</div> : null}
              {donorOf(line.id) ? (
                <div className={styles.donorHint}>
                  De {donorOf(line.id)?.name}
                  {donorOf(line.id)?.stickId ? <span>(cadastrada)</span> : null}
                  <button type="button" className="link" onClick={() => setNotPerson((n) => ({ ...n, [line.id]: true }))}>
                    Não é pessoa
                  </button>
                </div>
              ) : null}
              {bill ? (
                <div className={`${styles.matchHint} ${styles.billHint}`}>
                  É {bill.description} de {brDate(bill.dueDate).slice(0, 5)}?
                  {Math.abs(bill.amount - Math.abs(line.amount)) >= 0.005 ? <span>(previsto {money(bill.amount, currency)})</span> : null}
                  <button type="button" className="link" disabled={isSaving} onClick={() => payBill(line.id, bill.id)}>
                    {bill.kind === "in" ? "Sim, receber" : "Sim, pagar"}
                  </button>
                </div>
              ) : null}
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

function RulesList({
  rules,
  nameOf,
  isSaving,
  onForget,
  onBack,
}: {
  rules: CategoryRule[];
  nameOf: Map<string, string>;
  isSaving: boolean;
  onForget: (ruleId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <p className="muted">Quando o texto aparece no extrato, a categoria já vem escolhida.</p>
        {rules.length === 0 ? <p className="muted">Nenhuma regra. Use “Sempre” ao classificar.</p> : null}
        {[...rules]
          .sort((a, b) => a.pattern.localeCompare(b.pattern, "pt-BR"))
          .map((r) => (
            <div key={r.id} className={styles.reportRow}>
              <span>
                <b>{r.pattern}</b> → {nameOf.get(r.accountId) ?? "categoria removida"}
              </span>
              <button type="button" className={`link ${styles.dangerLink}`} disabled={isSaving} onClick={() => onForget(r.id)}>
                Esquecer
              </button>
            </div>
          ))}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
