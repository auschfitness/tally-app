// Validação na fronteira das Server Actions da Contabilidade. Nunca confia no cliente:
// o lançamento é revalidado aqui (mesma regra de balanceEntry) e a conta é checada.
import { AccountType } from "./types";
import { round2 } from "./domain";

const TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];
export function asAccountType(v: string): AccountType | null {
  return (TYPES as string[]).includes(v) ? (v as AccountType) : null;
}

// ----- Conta do plano de contas -----
export interface AccountInput {
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string[]> };

export function parseAccountInput(formData: FormData): Parsed<AccountInput> {
  const fieldErrors: Record<string, string[]> = {};
  const s = (name: string) => String(formData.get(name) ?? "").trim();

  const code = s("code");
  if (!code) fieldErrors.code = ["Informe o código da conta."];
  else if (!/^[0-9.]+$/.test(code)) fieldErrors.code = ["Use apenas números e pontos (ex.: 4.1.05)."];

  const name = s("name");
  if (!name) fieldErrors.name = ["Informe o nome da conta."];

  const type = asAccountType(s("type"));
  if (!type) fieldErrors.type = ["Escolha o tipo da conta."];

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, data: { code, name, type: type as AccountType, parentId: s("parentId") || null } };
}

// ----- Lançamento (cabeçalho + partidas) -----
// Vem do editor cliente já estruturado; ainda assim revalidamos tudo no servidor.
export interface RawLine {
  accountId: string | null;
  debit: number;
  credit: number;
  description: string;
}
export interface EntryInput {
  id: string | null; // rascunho existente (editar) ou null (criar)
  date: string; // ISO
  memo: string;
  reference: string;
  fundId: string | null;
  lines: RawLine[];
}

export interface CleanLine {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

// Normaliza: descarta linhas totalmente vazias, arredonda valores, força um lado só.
// Devolve as linhas "limpas" (prontas para inserir) ou os erros de validação.
export function validateEntry(input: EntryInput): Parsed<{
  date: string;
  memo: string;
  reference: string;
  fundId: string | null;
  lines: CleanLine[];
}> {
  const fieldErrors: Record<string, string[]> = {};

  const date = (input.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fieldErrors.date = ["Informe uma data válida."];

  const clean: CleanLine[] = [];
  for (const l of input.lines) {
    const debit = round2(l.debit);
    const credit = round2(l.credit);
    const hasAccount = Boolean(l.accountId);
    // Linha completamente vazia é descartada (a UI sempre deixa uma linha em branco no fim).
    if (!hasAccount && debit <= 0 && credit <= 0) continue;

    if (debit > 0 && credit > 0) {
      fieldErrors.lines = ["Cada partida tem um lado só: débito OU crédito."];
      break;
    }
    if (!hasAccount) {
      fieldErrors.lines = ["Escolha a conta de cada partida com valor."];
      break;
    }
    if (debit <= 0 && credit <= 0) {
      fieldErrors.lines = ["Informe o valor de cada partida."];
      break;
    }
    clean.push({ accountId: l.accountId as string, debit: debit > 0 ? debit : 0, credit: credit > 0 ? credit : 0, description: (l.description || "").trim() });
  }

  if (!fieldErrors.lines && clean.length < 1) fieldErrors.lines = ["Adicione ao menos uma partida."];

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: { date, memo: (input.memo || "").trim(), reference: (input.reference || "").trim(), fundId: input.fundId || null, lines: clean },
  };
}
