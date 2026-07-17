// Validação do registro de doação (fronteira de Server Action). Nunca confia em nada
// além dos nomes dos campos. Doador = Stick, nome digitado, ou anônimo.
import { asMethod } from "./domain";
import type { DonationMethod } from "./types";

export interface DonationInput {
  stickId: string | null; // preenchido no modo "stick"
  donorName: string; // modo "typed" (ou resolvido depois p/ stick)
  donorTaxId: string; // CPF (BR), opcional
  fundId: string | null; // fundo existente selecionado
  newFundName: string; // fundo novo digitado (a action garante em `funds`)
  amount: number;
  method: DonationMethod;
  date: string; // ISO ("" = default do banco)
  note: string;
  goodsProvided: boolean;
  goodsDescription: string;
  goodsValue: number | null;
}

export type Validated =
  | { ok: true; data: DonationInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseDonationInput(formData: FormData): Validated {
  const fieldErrors: Record<string, string[]> = {};
  const s = (name: string) => String(formData.get(name) ?? "").trim();

  const mode = s("donorMode"); // "stick" | "typed" | "anon"
  const stickId = mode === "stick" ? s("stickId") || null : null;
  const donorName = mode === "typed" ? s("donorName") : "";
  if (mode === "stick" && !stickId) fieldErrors.donor = ["Escolha a pessoa."];
  if (mode === "typed" && !donorName) fieldErrors.donor = ["Informe o nome do doador."];

  const amount = Number.parseFloat(s("amount"));
  if (!Number.isFinite(amount) || amount <= 0) fieldErrors.amount = ["Valor deve ser maior que zero."];

  const date = s("date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fieldErrors.date = ["Data inválida."];

  const goodsProvided = formData.get("goodsProvided") === "1";
  const gvRaw = s("goodsValue");
  const goodsValue = gvRaw ? Number.parseFloat(gvRaw) : null;

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      stickId,
      donorName,
      donorTaxId: s("donorTaxId"),
      fundId: s("fundId") || null,
      newFundName: s("newFundName"),
      amount,
      method: asMethod(s("method")),
      date,
      note: s("note"),
      goodsProvided,
      goodsDescription: s("goodsDescription"),
      goodsValue: goodsValue != null && Number.isFinite(goodsValue) && goodsValue >= 0 ? goodsValue : null,
    },
  };
}
