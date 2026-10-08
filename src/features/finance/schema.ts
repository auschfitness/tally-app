// Validação do lançamento simples (fronteira de Server Action). O banco (record_transaction)
// revalida tudo; isto dá erro por campo antes de ir ao servidor.
import type { TxKind } from "./domain";

export interface TransactionInput {
  kind: TxKind;
  amount: number;
  date: string;
  accountId: string;
  counterId: string;
  memo: string;
  fundId: string | null;
  donorStickId: string | null;
  donorName: string;
  method: string;
}

export type Validated =
  | { ok: true; data: TransactionInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseTransactionInput(formData: FormData): Validated {
  const fieldErrors: Record<string, string[]> = {};
  const rawKind = text(formData, "kind");
  const kind: TxKind = rawKind === "out" || rawKind === "transfer" ? rawKind : "in";

  const amount = Number.parseFloat(text(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) fieldErrors.amount = ["Informe um valor maior que zero."];

  const date = text(formData, "date");
  if (!ISO_DATE.test(date)) fieldErrors.date = ["Data inválida."];

  const accountId = text(formData, "accountId");
  if (!accountId) fieldErrors.accountId = [kind === "transfer" ? "Escolha a conta de origem." : "Escolha a conta."];

  const counterId = text(formData, "counterId");
  if (!counterId) fieldErrors.counterId = [kind === "transfer" ? "Escolha a conta de destino." : "Escolha a categoria."];
  else if (counterId === accountId) fieldErrors.counterId = ["Origem e destino precisam ser diferentes."];

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      kind,
      amount,
      date,
      accountId,
      counterId,
      memo: text(formData, "memo"),
      fundId: text(formData, "fundId") || null,
      donorStickId: kind === "in" ? text(formData, "donorStickId") || null : null,
      donorName: kind === "in" ? text(formData, "donorName") : "",
      method: text(formData, "method"),
    },
  };
}
