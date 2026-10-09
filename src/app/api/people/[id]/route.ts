import { NextResponse } from "next/server";
import { requireOrg, can } from "@/lib/auth/session";
import { getPerson } from "@/features/sticks/queries";

// Ficha em JSON para a lista trocar de pessoa sem recarregar a página. É uma rota (GET) e não uma
// Server Action de propósito: ações entram numa fila e a leitura ficava presa atrás de uma gravação.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const detail = await getPerson(ctx.supabase, ctx.orgId, id, can(ctx, "finance.manage"));
  return detail ? NextResponse.json(detail) : NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });
}
