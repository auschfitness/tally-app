"use client";

// Navegação da área do contador dentro de Finanças (spec 10): as abas do módulo com
// "Contador" ativa e, embaixo, as sub-abas da contabilidade. O item ativo vem do pathname.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FinanceTabs } from "@/features/finance/components/FinanceTabs";
import financeStyles from "@/features/finance/finance.module.css";

const BASE = "/finance/contador";
const TABS: { href: string; label: string }[] = [
  { href: BASE, label: "Visão geral" },
  { href: `${BASE}/accounts`, label: "Plano de contas" },
  { href: `${BASE}/entries`, label: "Lançamentos" },
  { href: `${BASE}/reports`, label: "Relatórios" },
];

export function AccountingNav() {
  const pathname = usePathname();
  const isActive = (href: string): boolean => (href === BASE ? pathname === BASE : pathname.startsWith(href));

  return (
    <>
      <FinanceTabs active="contador" />
      <nav className="tabs2" aria-label="Seções do contador">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`tab2 ${financeStyles.tabLink}${isActive(t.href) ? " on" : ""}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
