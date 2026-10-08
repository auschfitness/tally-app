import { redirect } from "next/navigation";

// Contabilidade agora é a aba Contador de Finanças (spec 10). Mantém endereços antigos
// (favoritos, links salvos) caindo na mesma tela, com a mesma querystring.
export default async function OldAccountingPage({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<never> {
  const { rest } = await params;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(v) ? v : v ? [v] : []) query.append(k, item);
  }
  const path = ["/finance/contador", ...(rest ?? [])].join("/");
  redirect(query.size ? `${path}?${query}` : path);
}
