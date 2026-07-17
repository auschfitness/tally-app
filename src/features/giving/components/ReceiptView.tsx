"use client";

// Renderiza um recibo a partir do SNAPSHOT imutável (donation_receipts.snapshot).
// Layout e idioma dirigidos pelo país (BR: CPF/CNPJ, registro não-dedutível; US: EIN/
// 501c3 + frase de bens/serviços). Imprimível (o chrome do app some no @media print).
import Link from "next/link";
import { money } from "@/lib/utils/money";
import { brDate } from "@/lib/utils/date";
import type { Country, DonationMethod, ReceiptSnapshot } from "../types";
import styles from "../giving.module.css";

const METHOD_EN: Record<DonationMethod, string> = {
  dinheiro: "Cash",
  pix: "Pix",
  cartao: "Card",
  transferencia: "Transfer",
  cheque: "Check",
  outro: "Other",
};
const METHOD_PT: Record<DonationMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  transferencia: "Transferência",
  cheque: "Cheque",
  outro: "Outro",
};

interface Labels {
  title: string;
  receiptNo: string;
  issued: string;
  donor: string;
  donorTaxId: string;
  orgTaxId: string;
  taxExempt: string;
  colDate: string;
  colFund: string;
  colMethod: string;
  colAmount: string;
  total: string;
  method: (m: DonationMethod) => string;
}

function labelsFor(country: Country, snap: ReceiptSnapshot): Labels {
  if (country === "US") {
    return {
      title: snap.kind === "annual" ? `${snap.periodYear ?? ""} Annual Giving Statement` : "Donation Receipt",
      receiptNo: "Receipt no.",
      issued: "Issued",
      donor: "Donor",
      donorTaxId: "SSN/TIN",
      orgTaxId: "EIN",
      taxExempt: "Tax-exempt status",
      colDate: "Date",
      colFund: "Fund",
      colMethod: "Method",
      colAmount: "Amount",
      total: "Total",
      method: (m) => METHOD_EN[m],
    };
  }
  return {
    title: snap.kind === "annual" ? `Declaração anual de doações ${snap.periodYear ?? ""}` : "Recibo de doação",
    receiptNo: "Recibo nº",
    issued: "Emitido em",
    donor: "Doador",
    donorTaxId: "CPF",
    orgTaxId: "CNPJ",
    taxExempt: "Situação fiscal",
    colDate: "Data",
    colFund: "Fundo",
    colMethod: "Método",
    colAmount: "Valor",
    total: "Total",
    method: (m) => METHOD_PT[m],
  };
}

export function ReceiptView({ snapshot }: { snapshot: ReceiptSnapshot }) {
  const s = snapshot;
  const L = labelsFor(s.country, s);

  return (
    <div className={styles.receiptWrap}>
      <div className={`${styles.receiptBar} ${styles.noprint}`}>
        <Link href="/giving" className="link">← Voltar</Link>
        <button className="btn sm" onClick={() => window.print()}>Imprimir / PDF</button>
      </div>

      <article className={styles.receipt}>
        <header className={styles.receiptHead}>
          <div>
            <div className={styles.receiptOrg}>{s.org.legalName || s.org.name}</div>
            {s.org.name && s.org.legalName && s.org.name !== s.org.legalName ? (
              <div className={styles.receiptMuted}>{s.org.name}</div>
            ) : null}
            <div className={styles.receiptMuted}>
              {L.orgTaxId}: {s.org.taxId || "—"}
              {s.country === "US" && s.org.taxExemptStatus ? ` · ${L.taxExempt}: ${s.org.taxExemptStatus}` : ""}
              {s.country === "BR" && s.org.stateRegistration ? ` · IE: ${s.org.stateRegistration}` : ""}
            </div>
            {s.org.addressText ? <div className={styles.receiptMuted}>{s.org.addressText}</div> : null}
          </div>
          <div className={styles.receiptNo}>
            <div className={styles.receiptTitle}>{L.title}</div>
            <div className={styles.receiptMuted}>{L.receiptNo} {s.receiptNo}</div>
            <div className={styles.receiptMuted}>{L.issued} {brDate(s.issuedAt.slice(0, 10))}</div>
          </div>
        </header>

        <div className={styles.receiptDonor}>
          <span className={styles.receiptMuted}>{L.donor}</span>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{s.donor.name}</div>
          {s.donor.taxId ? <div className={styles.receiptMuted}>{L.donorTaxId}: {s.donor.taxId}</div> : null}
        </div>

        <table className={styles.receiptTable}>
          <thead>
            <tr>
              <th>{L.colDate}</th>
              <th>{L.colFund}</th>
              <th>{L.colMethod}</th>
              <th style={{ textAlign: "right" }}>{L.colAmount}</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((ln, i) => (
              <tr key={i}>
                <td>{brDate(ln.date)}</td>
                <td>{ln.fundName}</td>
                <td>{L.method(ln.method)}</td>
                <td style={{ textAlign: "right" }}>{money(ln.amount, s.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>{L.total}</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{money(s.total, s.currency)}</td>
            </tr>
          </tfoot>
        </table>

        <div className={styles.receiptLegal}>
          <p>{s.legalText}</p>
          {s.deductibilityNote ? <p>{s.deductibilityNote}</p> : null}
        </div>

        <div className={styles.receiptSign}>
          <div className={styles.receiptSignLine} />
          <div className={styles.receiptMuted}>{s.org.legalName || s.org.name}</div>
        </div>
      </article>
    </div>
  );
}
