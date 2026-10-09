// Abas de Finanças: o trabalho do dia a dia (Movimentações, Contas, Dízimos) e, à parte,
// Relatórios, que junta o Fechamento do mês e a área do contador (balancete, lançamentos,
// plano de contas) como sub-abas. A aba vive na URL. Sem hooks: Server e Client Components.
import Link from "next/link";
import styles from "../finance.module.css";

export type FinanceTabKey = "movimentacoes" | "contas" | "dizimos" | "relatorios";
export type ReportsTabKey = "fechamento" | "balancete" | "lancamentos" | "plano";

const TABS: { key: FinanceTabKey; label: string; href: string }[] = [
  { key: "movimentacoes", label: "Movimentações", href: "/finance" },
  { key: "contas", label: "Contas", href: "/finance?aba=contas" },
  { key: "dizimos", label: "Dízimos", href: "/finance?aba=dizimos" },
  { key: "relatorios", label: "Relatórios", href: "/finance?aba=fechamento" },
];

const REPORTS: { key: ReportsTabKey; label: string; href: string }[] = [
  { key: "fechamento", label: "Fechamento do mês", href: "/finance?aba=fechamento" },
  { key: "balancete", label: "Balancete e DRE", href: "/finance/contador/reports" },
  { key: "lancamentos", label: "Lançamentos", href: "/finance/contador/entries" },
  { key: "plano", label: "Plano de contas", href: "/finance/contador/accounts" },
];

export function FinanceTabs({ active }: { active: FinanceTabKey }) {
  return (
    <nav className={`tabs ${styles.tabsRow} ${styles.noprint}`} aria-label="Seções de Finanças">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`tab ${styles.tabLink}${active === t.key ? " on" : ""}`}
          aria-current={active === t.key ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function ReportsTabs({ active }: { active: ReportsTabKey }) {
  return (
    <>
      <FinanceTabs active="relatorios" />
      <nav className={`tabs2 ${styles.tabsRow} ${styles.noprint}`} aria-label="Relatórios">
        {REPORTS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`tab2 ${styles.tabLink}${active === t.key ? " on" : ""}`}
            aria-current={active === t.key ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
