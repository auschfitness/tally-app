"use client";

// Sub-navegação da Contabilidade (abas Visão geral / Plano de contas / Lançamentos /
// Relatórios). Usa a barra de abas global (.tabs/.tab). O item ativo é decidido pelo
// pathname atual — não precisa de prop.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/accounting", label: "Visão geral" },
  { href: "/accounting/accounts", label: "Plano de contas" },
  { href: "/accounting/entries", label: "Lançamentos" },
  { href: "/accounting/reports", label: "Relatórios" },
];

export function AccountingNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/accounting" ? pathname === "/accounting" : pathname.startsWith(href);

  return (
    <nav className="tabs" aria-label="Seções da contabilidade">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`tab${isActive(t.href) ? " on" : ""}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
