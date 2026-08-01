"use client";

// Editor de lançamento (Client) — o coração da tela. Cabeçalho (data, descrição,
// referência, fundo) + partidas em duas colunas (Débito / Crédito). Mostra ao vivo o
// total de débitos, de créditos e a diferença; só habilita "Postar" quando fecha e há
// ≥2 partidas (espelha post_journal_entry). Rascunho é editável; postar torna imutável.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/shared/Select";
import { DateField } from "@/components/shared/DateField";
import { money, parseMoneyInput } from "@/lib/utils/money";
import { balanceEntry, buildAccountTree, flattenTree } from "../domain";
import { saveDraftEntryAction, postEntryAction, deleteDraftEntryAction } from "../actions";
import type { Account, DraftLine, EntryDetail, Fund } from "../types";
import type { EntryInput } from "../schema";
import styles from "../accounting.module.css";

interface EditorLine {
  key: number;
  accountId: string;
  debit: string; // texto cru (parseMoneyInput interpreta)
  credit: string;
  description: string;
}

let seq = 0;
const blank = (): EditorLine => ({ key: ++seq, accountId: "", debit: "", credit: "", description: "" });

export function EntryEditor({
  accounts,
  funds,
  currency,
  entry,
  today,
}: {
  accounts: Account[];
  funds: Fund[];
  currency: string;
  entry: EntryDetail | null; // null = novo
  today: string; // ISO calculado no servidor (evita hydration mismatch)
}) {
  const router = useRouter();

  // Contas para o seletor: em ordem hierárquica, indentadas. Só ativas — mas se o
  // lançamento já referencia uma inativa, ela continua aparecendo (não perder o dado).
  const options = useMemo(() => {
    const usedIds = new Set((entry?.lines ?? []).map((l) => l.accountId));
    const visible = accounts.filter((a) => a.isActive || usedIds.has(a.id));
    return flattenTree(buildAccountTree(visible));
  }, [accounts, entry]);

  const [date, setDate] = useState(entry?.date ?? today);
  const [memo, setMemo] = useState(entry?.memo ?? "");
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [fundId, setFundId] = useState(entry?.fundId ?? "");
  const [lines, setLines] = useState<EditorLine[]>(() => {
    if (entry && entry.lines.length > 0) {
      return entry.lines.map((l) => ({
        key: ++seq,
        accountId: l.accountId,
        debit: l.debit > 0 ? money(l.debit, currency) : "",
        credit: l.credit > 0 ? money(l.credit, currency) : "",
        description: l.description,
      }));
    }
    return [blank(), blank()];
  });

  const [pending, setPending] = useState<null | "save" | "post" | "delete">(null);
  const [err, setErr] = useState<string | null>(null);

  // Converte para o modelo puro e balanceia (totais ao vivo + gate do "Postar").
  const draftLines: DraftLine[] = lines.map((l) => ({
    accountId: l.accountId || null,
    debit: parseMoneyInput(l.debit, currency) ?? 0,
    credit: parseMoneyInput(l.credit, currency) ?? 0,
    description: l.description,
  }));
  const balance = useMemo(() => balanceEntry(draftLines), [draftLines]);

  function patch(key: number, p: Partial<EditorLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, blank()]);
  }
  function removeLine(key: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function buildInput(): EntryInput {
    return {
      id: entry?.id ?? null,
      date,
      memo,
      reference,
      fundId: fundId || null,
      lines: draftLines,
    };
  }

  async function save(): Promise<string | null> {
    setErr(null);
    const res = await saveDraftEntryAction(buildInput());
    if (!res.success) {
      setErr(res.message);
      return null;
    }
    return res.data.entryId;
  }

  async function onSaveDraft() {
    setPending("save");
    const id = await save();
    setPending(null);
    if (id) router.push(`/accounting/entries/${id}`);
  }

  async function onPost() {
    setPending("post");
    const id = await save();
    if (!id) {
      setPending(null);
      return;
    }
    const res = await postEntryAction(id);
    setPending(null);
    if (!res.success) {
      setErr(res.message);
      // O rascunho foi salvo; leva para o detalhe para o usuário ajustar e postar de novo.
      router.push(`/accounting/entries/${id}`);
      return;
    }
    router.push(`/accounting/entries/${id}`);
  }

  async function onDelete() {
    if (!entry) return;
    if (!confirm("Excluir este rascunho? Isso não pode ser desfeito.")) return;
    setPending("delete");
    const res = await deleteDraftEntryAction(entry.id);
    setPending(null);
    if (!res.success) setErr(res.message);
    else router.push("/accounting/entries");
  }

  const diffClass = balance.balanced ? styles.diffOk : styles.diffBad;

  return (
    <div className="panel">
      <div className={styles.entryGrid}>
        <div className="field">
          <label>Data</label>
          <DateField value={date} onChange={(v) => setDate(v)} />
        </div>
        <div className="field">
          <label>Fundo (opcional)</label>
          <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
            <option value="">— nenhum —</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="field full">
          <label>Descrição</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="ex.: Dízimos do culto de domingo" autoComplete="off" />
        </div>
        <div className="field full">
          <label>Referência (opcional)</label>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ex.: nº do comprovante" autoComplete="off" />
        </div>
      </div>

      <table className={styles.linesTable}>
        <thead>
          <tr>
            <th>Conta</th>
            <th>Histórico</th>
            <th className="num">Débito</th>
            <th className="num">Crédito</th>
            <th className={styles.lineDrop} />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.key}>
              <td>
                <Select value={l.accountId} onChange={(e) => patch(l.key, { accountId: e.target.value })} aria-label="Conta">
                  <option value="">— escolher conta —</option>
                  {options.map((a) => (
                    <option key={a.id} value={a.id}>
                      {" ".repeat(a.depth * 2)}
                      {a.code} · {a.name}
                    </option>
                  ))}
                </Select>
              </td>
              <td>
                <input
                  value={l.description}
                  onChange={(e) => patch(l.key, { description: e.target.value })}
                  placeholder="opcional"
                  autoComplete="off"
                />
              </td>
              <td className="num">
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={l.debit}
                  onChange={(e) => patch(l.key, { debit: e.target.value, credit: "" })}
                  onBlur={() => {
                    const a = parseMoneyInput(l.debit, currency);
                    patch(l.key, { debit: a && a > 0 ? money(a, currency) : "" });
                  }}
                  placeholder={currency === "USD" ? "$0.00" : "R$ 0,00"}
                  style={{ textAlign: "right" }}
                />
              </td>
              <td className="num">
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={l.credit}
                  onChange={(e) => patch(l.key, { credit: e.target.value, debit: "" })}
                  onBlur={() => {
                    const a = parseMoneyInput(l.credit, currency);
                    patch(l.key, { credit: a && a > 0 ? money(a, currency) : "" });
                  }}
                  placeholder={currency === "USD" ? "$0.00" : "R$ 0,00"}
                  style={{ textAlign: "right" }}
                />
              </td>
              <td className={styles.lineDrop}>
                <button
                  type="button"
                  className="btn ghost sm"
                  aria-label="Remover partida"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(l.key)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost sm" onClick={addLine}>
          + Adicionar partida
        </button>
      </div>

      <div className={styles.totals}>
        <div>
          <span className="tk">Débitos</span>
          <span className="tv">{money(balance.debitTotal, currency)}</span>
        </div>
        <div>
          <span className="tk">Créditos</span>
          <span className="tv">{money(balance.creditTotal, currency)}</span>
        </div>
        <div>
          <span className="tk">Diferença</span>
          <span className={`tv ${diffClass}`}>{money(balance.difference, currency)}</span>
        </div>
      </div>

      {!balance.canPost && (balance.debitTotal > 0 || balance.creditTotal > 0) ? (
        <ul className={styles.hintList}>
          {balance.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {err ? <p className={styles.err}>{err}</p> : null}

      <div className={styles.footer}>
        <div>
          {entry ? (
            <button type="button" className="btn danger" disabled={pending !== null} onClick={onDelete}>
              {pending === "delete" ? "Excluindo…" : "Excluir rascunho"}
            </button>
          ) : null}
        </div>
        <div className={styles.footerActions}>
          <button type="button" className="btn ghost" disabled={pending !== null} onClick={() => router.push("/accounting/entries")}>
            Cancelar
          </button>
          <button type="button" className="btn ghost" disabled={pending !== null} onClick={onSaveDraft}>
            {pending === "save" ? "Salvando…" : "Salvar rascunho"}
          </button>
          <button type="button" className="btn" disabled={pending !== null || !balance.canPost} onClick={onPost} title={balance.canPost ? "" : "O lançamento precisa fechar (débitos = créditos) e ter ≥2 partidas."}>
            {pending === "post" ? "Postando…" : "Postar"}
          </button>
        </div>
      </div>
    </div>
  );
}
