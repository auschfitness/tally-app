// Abas de Finanças (spec 10). A aba vive na URL; a do contador é uma rota própria
// (/finance/contador) com sub-abas. Sem hooks: serve em Server e Client Components.
import Link from "next/link";
import styles from "../finance.module.css";

export type FinanceTabKey = "movimentacoes" | "dizimos" | "fechamento" | "contador";

const TABS: { key: FinanceTabKey; label: string; href: string }[] = [
  { key: "movimentacoes", label: "Movimentações", href: "/finance" },
  { key: "dizimos", label: "Dízimos", href: "/finance?aba=dizimos" },
  { key: "fechamento", label: "Fechamento", href: "/finance?aba=fechamento" },
  { key: "contador", label: "Contador", href: "/finance/contador" },
];

export function FinanceTabs({ active }: { active: FinanceTabKey }) {
  return (
    <nav className={`tabs ${styles.noprint}`} aria-label="Seções de Finanças">
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
