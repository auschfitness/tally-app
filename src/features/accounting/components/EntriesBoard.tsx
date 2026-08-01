"use client";

// Lançamentos (Client). Lista por período (reusa PeriodFilter da Onda 2) com data,
// descrição, situação e valor. Filtro por situação. Clicar abre o lançamento (rascunho
// = editável; postado = só-leitura + estornar). "Novo lançamento" leva ao editor.
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/utils/money";
import { brDate } from "@/lib/utils/date";
import { Select } from "@/components/shared/Select";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { inPeriod, resolvePeriod, type PeriodRange, type PeriodValue } from "@/lib/utils/period";
import { statusLabel } from "../domain";
import type { EntryStatus, JournalEntry } from "../types";
import styles from "../accounting.module.css";

export function EntriesBoard({ entries, currency }: { entries: JournalEntry[]; currency: string }) {
  const router = useRouter();
  const [range, setRange] = useState<PeriodRange>(() => resolvePeriod("thisMonth", new Date()));
  const onPeriod = useCallback((v: PeriodValue) => setRange({ from: v.from, to: v.to }), []);
  const [status, setStatus] = useState<"" | EntryStatus>("");

  const filtered = useMemo(
    () => entries.filter((e) => inPeriod(e.date, range) && (!status || e.status === status)),
    [entries, range, status],
  );

  const postedTotal = useMemo(
    () => filtered.filter((e) => e.status === "posted").reduce((s, e) => s + e.debitTotal, 0),
    [filtered],
  );

  return (
    <div className="panel">
      <div className={styles.head}>
        <div className={styles.toolbar}>
          <PeriodFilter onChange={onPeriod} defaultPreset="thisMonth" storageKey="accounting.entries" />
          <Select compact value={status} onChange={(e) => setStatus(e.target.value as "" | EntryStatus)}>
            <option value="">Todas as situações</option>
            <option value="draft">Rascunhos</option>
            <option value="posted">Postados</option>
            <option value="void">Anulados</option>
          </Select>
        </div>
        <Link className="btn sm" href="/accounting/entries/new">
          Novo lançamento
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Nenhum lançamento no período. Ajuste o filtro ou crie um novo.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Referência</th>
              <th>Situação</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className={styles.rowLink} onClick={() => router.push(`/accounting/entries/${e.id}`)}>
                <td className="code">{brDate(e.date)}</td>
                <td>{e.memo || <span className="muted">(sem descrição)</span>}</td>
                <td className="muted" style={{ fontSize: 12 }}>{e.reference || "—"}</td>
                <td>
                  <span className={`${styles.badge} ${e.status}`}>{statusLabel(e.status)}</span>
                </td>
                <td className={`num ${e.status === "void" ? "muted" : ""}`}>{money(e.debitTotal, currency)}</td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td colSpan={4}>Total postado no período</td>
              <td className="num">{money(postedTotal, currency)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
