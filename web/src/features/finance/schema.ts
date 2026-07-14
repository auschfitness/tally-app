// Validação do lançamento (fronteira de Server Action).
import { type EntryType } from "./domain";

export interface EntryInput {
  type: EntryType;
  desc: string;
  amount: number;
  cat: string;
  fund: string;
  campus: string;
  date: string;
  newCategory: boolean; // categoria digitada que ainda não existe em finance_categories
}

export type Validated =
  | { ok: true; data: EntryInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseEntryInput(formData: FormData): Validated {
  const fieldErrors: Record<string, string[]> = {};

  const type: EntryType = String(formData.get("type") ?? "in") === "out" ? "out" : "in";
  const desc = String(formData.get("desc") ?? "").trim();
  if (!desc) fieldErrors.desc = ["Informe a descrição."];

  const amount = Number.parseFloat(String(formData.get("amount") ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) fieldErrors.amount = ["Valor deve ser maior que zero."];

  const cat = String(formData.get("cat") ?? "").trim();
  if (!cat) fieldErrors.cat = ["Escolha uma categoria."];

  const date = String(formData.get("date") ?? "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fieldErrors.date = ["Data inválida."];

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      type,
      desc,
      amount,
      cat,
      fund: String(formData.get("fund") ?? "").trim(),
      campus: String(formData.get("campus") ?? "").trim(),
      date,
      newCategory: formData.get("newCategory") === "1",
    },
  };
}
