// Tipos de domínio da Contabilidade (partidas dobradas). Espelham o motor do banco
// (m48): plano de contas (ledger_accounts) + lançamentos (journal_entries) com
// partidas (journal_lines) débito/crédito. Ver docs/handoffs/financeiro-contabilidade.md.
import type { Database } from "@/lib/database.types";

export type AccountType = Database["public"]["Enums"]["ledger_account_type"]; // asset|liability|equity|revenue|expense
export type EntryStatus = Database["public"]["Enums"]["journal_status"]; // draft|posted|void

// Uma conta do plano de contas (linha crua já normalizada).
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
}

// Conta na árvore (por code/parent_id), com filhas e profundidade para indentar.
export interface AccountNode extends Account {
  depth: number;
  children: AccountNode[];
}

// Um grupo da árvore por tipo (Ativo, Passivo, ...), na ordem contábil.
export interface AccountGroup {
  type: AccountType;
  label: string;
  roots: AccountNode[];
}

// Uma partida em edição no cliente (rascunho). `debit`/`credit` em número (reais),
// exatamente um lado > 0 — a regra do banco (journal_lines_one_side).
export interface DraftLine {
  accountId: string | null;
  debit: number; // 0 quando o lado é crédito
  credit: number; // 0 quando o lado é débito
  description: string;
}

// Resultado de balancear um conjunto de partidas — alimenta os totais ao vivo e o
// gate do botão "Postar" (espelha post_journal_entry: ≥2 partidas, débitos=créditos, >0).
export interface BalanceResult {
  debitTotal: number;
  creditTotal: number;
  difference: number; // débitos − créditos (0 = fecha)
  balanced: boolean; // débitos === créditos (com tolerância de centavo)
  lineCount: number; // partidas com um lado válido preenchido
  positive: boolean; // total > 0
  canPost: boolean; // ≥2 partidas válidas, fecha e > 0
  errors: string[]; // motivos amigáveis para não poder postar (para exibir na UI)
}

// Cabeçalho de um lançamento (lista/detalhe).
export interface JournalEntry {
  id: string;
  date: string; // entry_date (ISO)
  memo: string;
  reference: string;
  status: EntryStatus;
  fundId: string | null;
  fundName: string;
  reversesEntryId: string | null;
  postedAt: string | null;
  debitTotal: number;
  creditTotal: number;
  lineCount: number;
}

// Uma partida já persistida (detalhe do lançamento), com a conta resolvida.
export interface EntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  fundId: string | null;
}

// Lançamento com as partidas (tela de detalhe/edição).
export interface EntryDetail extends JournalEntry {
  lines: EntryLine[];
}

// Uma linha do balancete (retorno de trial_balance): saldo já na convenção natural
// (ativo/despesa = débito−crédito; demais = crédito−débito).
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

// DRE simples derivada do balancete: receitas − despesas.
export interface IncomeStatement {
  revenue: number;
  expense: number;
  result: number; // superávit (>0) ou déficit (<0)
  revenueRows: TrialBalanceRow[];
  expenseRows: TrialBalanceRow[];
}

export interface Fund {
  id: string;
  name: string;
}
