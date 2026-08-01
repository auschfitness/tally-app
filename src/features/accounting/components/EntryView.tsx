"use client";

// Lançamento postado/anulado (Client, só-leitura). Postado é imutável (o banco bloqueia
// edição das partidas); a correção é via "Estornar" (void_journal_entry), com confirmação
// inline. Anulado fica apenas visível. Gated por finance.manage (RLS é a barreira real).
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/utils/money";
import { brDate } from "@/lib/utils/date";
import { statusLabel } from "../domain";
import { voidEntryAction } from "../actions";
import type { EntryDetail } from "../types";
import styles from "../accounting.module.css";

export function EntryView({ entry, currency }: { entry: EntryDetail; currency: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doVoid() {
    setPending(true);
    setErr(null);
    const res = await voidEntryAction(entry.id);
    setPending(false);
    if (!res.success) setErr(res.message);
    else {
      setConfirming(false);
      router.refresh();
    }
  }

  return (
    <div className="panel">
      <div className={styles.head}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong style={{ fontSize: 16 }}>{entry.memo || "(sem descrição)"}</strong>
            <span className={`${styles.badge} ${entry.status}`}>{statusLabel(entry.status)}</span>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {brDate(entry.date)}
            {entry.reference ? ` · ref. ${entry.reference}` : ""}
            {entry.fundName ? ` · fundo: ${entry.fundName}` : ""}
          </div>
        </div>
        <Link className="btn ghost sm" href="/accounting/entries">
          ← Lançamentos
        </Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Conta</th>
            <th>Histórico</th>
            <th className="num">Débito</th>
            <th className="num">Crédito</th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map((l) => (
            <tr key={l.id}>
              <td>
                <span className="code">{l.accountCode}</span> {l.accountName}
              </td>
              <td className="muted" style={{ fontSize: 12 }}>{l.description || "—"}</td>
              <td className="num">{l.debit > 0 ? money(l.debit, currency) : ""}</td>
              <td className="num">{l.credit > 0 ? money(l.credit, currency) : ""}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td colSpan={2}>Totais</td>
            <td className="num">{money(entry.debitTotal, currency)}</td>
            <td className="num">{money(entry.creditTotal, currency)}</td>
          </tr>
        </tbody>
      </table>

      {err ? <p className={styles.err}>{err}</p> : null}

      {entry.status === "posted" ? (
        <div className={styles.footer}>
          <span className="muted" style={{ fontSize: 13 }}>
            Um lançamento postado é imutável. Para corrigir, estorne — isso o anula (o histórico é preservado).
          </span>
          {confirming ? (
            <div className={styles.footerActions}>
              <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Confirmar estorno?</span>
              <button className="btn ghost" disabled={pending} onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button className="btn danger" disabled={pending} onClick={doVoid}>
                {pending ? "Estornando…" : "Estornar"}
              </button>
            </div>
          ) : (
            <button className="btn danger" onClick={() => setConfirming(true)}>
              Estornar lançamento
            </button>
          )}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Este lançamento foi anulado e não afeta os saldos.
        </p>
      )}
    </div>
  );
}
