"use client";

// Board de Giving/Doações (Client). Lista/filtra por doador, fundo e período (reusa
// PeriodFilter da Onda 2), mostra totais, a visão do doador (com declaração anual) e
// emite recibo por doação. Toda mutação é Server Action gated por finance.manage.
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { brDate } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import { Select } from "@/components/shared/Select";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { inPeriod, resolvePeriod, type PeriodRange, type PeriodValue } from "@/lib/utils/period";
import { methodLabel, sumDonations, totalsByFund, yearOf } from "../domain";
import { deleteDonationAction, issueAnnualReceipt, issueGiftReceipt } from "../actions";
import { DonationModal } from "./DonationModal";
import type { Country, Donation, Donor, Fund, ReceiptListItem } from "../types";
import styles from "../giving.module.css";

export function GivingBoard({
  donations,
  donors,
  funds,
  receipts,
  country,
  currency,
}: {
  donations: Donation[];
  donors: Donor[];
  funds: Fund[];
  receipts: ReceiptListItem[];
  country: Country;
  currency: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState<PeriodRange>(() => resolvePeriod("thisMonth", new Date()));
  const onPeriod = useCallback((v: PeriodValue) => setRange({ from: v.from, to: v.to }), []);
  const [donorId, setDonorId] = useState("");
  const [fund, setFund] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const fundNames = useMemo(() => {
    const set = new Set<string>(funds.map((f) => f.name));
    for (const d of donations) if (d.fundName) set.add(d.fundName);
    return [...set].sort();
  }, [funds, donations]);

  const periodD = useMemo(() => donations.filter((d) => inPeriod(d.date, range)), [donations, range]);
  const filtered = useMemo(
    () =>
      periodD.filter(
        (d) => (!donorId || d.stickId === donorId) && (!fund || (d.fundName || "Geral") === fund),
      ),
    [periodD, donorId, fund],
  );

  const total = sumDonations(filtered);
  const byFund = useMemo(() => totalsByFund(filtered), [filtered]);

  // Visão do doador selecionado (ano p/ declaração anual, das doações dele em todo o histórico).
  const donorAll = useMemo(() => (donorId ? donations.filter((d) => d.stickId === donorId) : []), [donations, donorId]);
  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const d of donorAll) {
      const y = yearOf(d.date);
      if (y) ys.add(y);
    }
    return [...ys].sort((a, b) => b - a);
  }, [donorAll]);
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? years[0] ?? new Date().getFullYear();
  const donorName = donors.find((d) => d.id === donorId)?.name ?? "";

  async function gift(id: string) {
    setBusy(id);
    setErr(null);
    const res = await issueGiftReceipt(id);
    setBusy(null);
    if (res.success) router.push(`/giving/receipt/${res.data.receiptId}`);
    else setErr(res.message);
  }

  async function annual() {
    setBusy("annual");
    setErr(null);
    const res = await issueAnnualReceipt({ stickId: donorId || null, donorName, year: activeYear });
    setBusy(null);
    if (res.success) router.push(`/giving/receipt/${res.data.receiptId}`);
    else setErr(res.message);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 className="page">Doações</h1>
          <p className="sub" style={{ margin: 0 }}>Giving por doador, com recibos. Ledger separado do Finance Lite.</p>
        </div>
        <PeriodFilter onChange={onPeriod} defaultPreset="thisMonth" storageKey="giving" align="right" />
        <button className="btn" onClick={() => setModalOpen(true)}>+ Registrar doação</button>
      </div>

      <div className="ministrip" style={{ marginTop: 14 }}>
        <div>
          <div className="mi-k">Total no período</div>
          <div className="mi-v pos">{money(total, currency)}</div>
        </div>
        <div>
          <div className="mi-k">Doações</div>
          <div className="mi-v">{filtered.length}</div>
        </div>
      </div>

      {err ? <div className="gerr" style={{ marginBottom: 10 }}>{err}</div> : null}

      <div className={styles.filters}>
        <Select compact value={donorId} onChange={(e) => { setDonorId(e.target.value); setYear(null); }}>
          <option value="">Todos os doadores</option>
          {donors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select compact value={fund} onChange={(e) => setFund(e.target.value)}>
          <option value="">Todos os fundos</option>
          {fundNames.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
      </div>

      {donorId ? (
        <div className={`panel ${styles.donorCard}`}>
          <div>
            <div className="mi-k">Doador</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{donorName}</div>
            <div className="muted">{money(sumDonations(donorAll), currency)} em {donorAll.length} doação(ões) no histórico</div>
          </div>
          <div className={styles.donorActions}>
            {years.length > 0 ? (
              <Select compact value={String(activeYear)} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            ) : null}
            <button className="btn ghost sm" disabled={busy === "annual" || donorAll.length === 0} onClick={annual}>
              {busy === "annual" ? "Emitindo…" : "Declaração anual"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="row2">
        <div className="panel">
          <div className="ph"><h3>Doações</h3></div>
          <table style={{ border: "none" }}>
            <tbody>
              <tr>
                <th>Data</th><th>Doador</th><th>Fundo</th><th>Método</th>
                <th style={{ textAlign: "right" }}>Valor</th><th />
              </tr>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty">Nenhuma doação neste filtro. Toque em “+ Registrar doação”.</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id}>
                    <td>{brDate(d.date)}</td>
                    <td><b>{d.donorName || <span className="muted">Anônimo</span>}</b></td>
                    <td>{d.fundName || <span className="muted">Geral</span>}</td>
                    <td><span className="muted">{methodLabel(d.method)}</span></td>
                    <td style={{ textAlign: "right" }} className="pos">{money(d.amount, currency)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="link" disabled={busy === d.id} onClick={() => gift(d.id)} style={{ marginRight: 8 }}>
                        {busy === d.id ? "…" : "Recibo"}
                      </button>
                      <form action={deleteDonationAction} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" title="Excluir" style={{ color: "var(--text-2)", border: "none", background: "none", fontSize: 15, cursor: "pointer" }}>×</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="ph"><h3>Total por fundo</h3></div>
          {byFund.length === 0 ? (
            <div className="empty">Sem doações no período.</div>
          ) : (
            byFund.map((f) => (
              <div key={f.fund} className={styles.fundrow}>
                <span>{f.fund}</span>
                <span className="pos" style={{ marginLeft: "auto", fontWeight: 600 }}>{money(f.total, currency)}</span>
              </div>
            ))
          )}

          <div className="ph" style={{ marginTop: 18 }}><h3>Recibos emitidos</h3></div>
          {receipts.length === 0 ? (
            <div className="empty">Nenhum recibo ainda.</div>
          ) : (
            receipts.slice(0, 8).map((r) => (
              <Link key={r.id} href={`/giving/receipt/${r.id}`} className={styles.receiptRow}>
                <div>
                  <b>{r.receiptNo}</b> <span className="muted">· {r.kind === "annual" ? `Anual ${r.periodYear ?? ""}` : "Doação"}</span>
                  <div className="meta">{r.donorName}</div>
                </div>
                <span className="pos" style={{ marginLeft: "auto", fontWeight: 600 }}>{money(r.total, r.currency)}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {modalOpen ? (
        <DonationModal
          donors={donors}
          funds={funds}
          country={country}
          currency={currency}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}
