"use client";

// Aba Dízimos (spec 10, fase 3): quem contribuiu no período, por pessoa. Tocar na pessoa
// abre as contribuições dela com o recibo de cada uma e a declaração anual. Registrar é
// o mesmo painel de lançamento (Entrada/Dízimos), então tudo cai no livro.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brDate, isoDate, today } from "@/lib/utils/date";
import { money } from "@/lib/utils/money";
import type { ActionResult } from "@/lib/errors";
import { inPeriod, type PeriodRange } from "@/lib/utils/period";
import { donorKey, donorTotals, methodLabel, sumDonations, type DonorTotal } from "@/features/giving/domain";
import { issueAnnualReceipt, issueGiftReceipt } from "@/features/giving/actions";
import type { Donation, ReceiptListItem } from "@/features/giving/types";
import { Panel } from "./Panel";
import styles from "../finance.module.css";

const normalize = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function TithesTab({
  donations,
  receipts,
  range,
  currency,
  onRegister,
}: {
  donations: Donation[];
  receipts: ReceiptListItem[];
  range: PeriodRange;
  currency: string;
  onRegister: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const inRange = useMemo(() => donations.filter((d) => inPeriod(d.date, range)), [donations, range]);
  const lastDateByDonor = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of inRange) {
      const k = donorKey(d);
      if ((m.get(k) ?? "") < d.date) m.set(k, d.date);
    }
    return m;
  }, [inRange]);
  const allDonors = useMemo(() => donorTotals(inRange), [inRange]);
  const q = normalize(query.trim());
  const donors = q ? allDonors.filter((t) => normalize(t.name).includes(q)) : allDonors;
  const opened = openKey ? allDonors.find((t) => t.key === openKey) : undefined;

  if (donations.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>Nenhum dízimo registrado ainda</div>
        <p>Registre a contribuição com o nome da pessoa. Ela aparece aqui e o recibo sai pronto.</p>
        <button type="button" className={`btn ${styles.press}`} onClick={onRegister}>
          Registrar dízimo
        </button>
      </div>
    );
  }

  return (
    <>
      <section className={styles.hero} aria-label="Total do período">
        <div className={styles.heroLabel}>Contribuições no período</div>
        <div className={styles.heroValue}>{money(sumDonations(inRange), currency)}</div>
        <div className={styles.periodSummary}>
          {allDonors.length === 1 ? "1 pessoa contribuiu" : `${allDonors.length} pessoas contribuíram`}
        </div>
      </section>

      <input
        className="searchbox"
        type="search"
        placeholder="Buscar pessoa"
        aria-label="Buscar pessoa"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {donors.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>{query ? "Ninguém com esse nome" : "Nada neste período"}</div>
          <p>{query ? "Confira a grafia ou limpe a busca." : "Troque o período no topo para ver outros meses."}</p>
        </div>
      ) : (
        donors.map((t) => (
          <button key={t.key} type="button" className={styles.row} onClick={() => setOpenKey(t.key)}>
            <div className={styles.rowMain}>
              <div className={styles.rowTitle}>{t.name}</div>
              <div className={styles.rowSub}>
                {t.count === 1 ? "1 contribuição" : `${t.count} contribuições`} · última em {brDate(lastDateByDonor.get(t.key) ?? "")}
              </div>
            </div>
            <div className={styles.amount}>{money(t.total, currency)}</div>
          </button>
        ))
      )}

      {opened ? (
        <Panel title={opened.name} onClose={() => setOpenKey(null)}>
          {(close) => (
            <DonorDetail
              donor={opened}
              donations={inRange.filter((d) => donorKey(d) === opened.key)}
              receipts={receipts}
              year={Number((range.to ?? isoDate(today())).slice(0, 4))}
              currency={currency}
              onClose={close}
            />
          )}
        </Panel>
      ) : null}
    </>
  );
}

function DonorDetail({
  donor,
  donations,
  receipts,
  year,
  currency,
  onClose,
}: {
  donor: DonorTotal;
  donations: Donation[];
  receipts: ReceiptListItem[];
  year: number;
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isIssuing, startIssuing] = useTransition();
  const receiptByDonation = new Map(receipts.filter((r) => r.kind === "gift" && r.donationId).map((r) => [r.donationId, r.id]));
  const isAnonymous = donor.key === "__anon__";

  const issue = (run: () => Promise<ActionResult<{ receiptId: string }>>): void => {
    setError("");
    startIssuing(async () => {
      const res = await run();
      if (res.success) router.push(`/finance/recibo/${res.data.receiptId}`);
      else setError(res.message);
    });
  };

  return (
    <div className={styles.panelForm}>
      <div className={styles.panelBody}>
        <div className="muted">No período</div>
        <div className={styles.detailAmount}>{money(donor.total, currency)}</div>
        {donations
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((d) => {
            const receiptId = receiptByDonation.get(d.id);
            return (
              <div key={d.id} className="kv">
                <span>
                  {brDate(d.date)} · {methodLabel(d.method)}
                  {d.fundName ? ` · ${d.fundName}` : ""}
                </span>
                <b>
                  {money(d.amount, currency)}{" "}
                  {receiptId ? (
                    <button type="button" className="link" onClick={() => router.push(`/finance/recibo/${receiptId}`)}>
                      Ver recibo
                    </button>
                  ) : (
                    <button type="button" className="link" disabled={isIssuing} onClick={() => issue(() => issueGiftReceipt(d.id))}>
                      Recibo
                    </button>
                  )}
                </b>
              </div>
            );
          })}
        {error ? <div className="gerr">{error}</div> : null}
      </div>
      <div className={styles.panelFoot}>
        <button className={`btn ghost ${styles.press}`} type="button" onClick={onClose}>
          Fechar
        </button>
        {isAnonymous ? null : (
          <button
            className={`btn ${styles.press}`}
            type="button"
            disabled={isIssuing}
            onClick={() => issue(() => issueAnnualReceipt({ stickId: donor.stickId, donorName: donor.name, year }))}
          >
            {isIssuing ? "Emitindo…" : `Declaração de ${year}`}
          </button>
        )}
      </div>
    </div>
  );
}
