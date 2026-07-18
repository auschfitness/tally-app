"use client";

// Histórico (Client). Lista as mensagens (recentes primeiro, reusa PeriodFilter),
// com status e contagem de destinatários. Abrir uma leva ao detalhe (/communication/[id]).
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { brDate } from "@/lib/utils/date";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { inPeriod, resolvePeriod, type PeriodRange, type PeriodValue } from "@/lib/utils/period";
import { audienceLabel, messageStatusLabel } from "../domain";
import type { MessageListItem } from "../types";
import styles from "../communication.module.css";

export function MessageLog({ messages }: { messages: MessageListItem[] }) {
  const router = useRouter();
  const [range, setRange] = useState<PeriodRange>(() => resolvePeriod("thisMonth", new Date()));
  const onPeriod = useCallback((v: PeriodValue) => setRange({ from: v.from, to: v.to }), []);

  const filtered = useMemo(
    () => messages.filter((m) => inPeriod(m.createdAt.slice(0, 10), range)),
    [messages, range],
  );

  return (
    <div className="panel">
      <div className="ph" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h3 style={{ marginRight: "auto" }}>Mensagens enviadas</h3>
        <PeriodFilter onChange={onPeriod} defaultPreset="thisMonth" storageKey="communication" align="right" />
      </div>

      <table style={{ border: "none" }}>
        <tbody>
          <tr>
            <th>Data</th>
            <th>Assunto</th>
            <th>Público</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Destinatários</th>
          </tr>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty">Nenhuma mensagem neste período.</td>
            </tr>
          ) : (
            filtered.map((m) => (
              <tr key={m.id} className={styles.logRow} onClick={() => router.push(`/communication/${m.id}`)}>
                <td>{brDate(m.createdAt.slice(0, 10))}</td>
                <td className={styles.msgSubject}>{m.subject}</td>
                <td><span className={styles.pill}>{audienceLabel(m.audienceKind)}</span></td>
                <td><span className="muted">{messageStatusLabel(m.status)}</span></td>
                <td style={{ textAlign: "right" }}>
                  <b className="pos">{m.pending + m.sent}</b>
                  {m.skipped > 0 ? <span className="muted"> · {m.skipped} pulado(s)</span> : null}
                  {m.failed > 0 ? <span className="neg"> · {m.failed} falhou</span> : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
