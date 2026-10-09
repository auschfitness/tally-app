import { redirect } from "next/navigation";

// A antiga "Visão geral" do contador virou Relatórios › Fechamento do mês.
export default function AccountingPage() {
  redirect("/finance?aba=fechamento");
}
