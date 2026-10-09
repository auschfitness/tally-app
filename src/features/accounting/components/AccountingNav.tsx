"use client";

// Navegação da área do contador dentro de Finanças: as abas do módulo com "Relatórios"
// ativa e, embaixo, as sub-abas (Fechamento do mês fica junto). O item ativo vem do pathname.
import { usePathname } from "next/navigation";
import { ReportsTabs, type ReportsTabKey } from "@/features/finance/components/FinanceTabs";

export function AccountingNav() {
  const pathname = usePathname();
  const active: ReportsTabKey = pathname.includes("/accounts") ? "plano" : pathname.includes("/entries") ? "lancamentos" : "balancete";
  return <ReportsTabs active={active} />;
}
