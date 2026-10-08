-- m63 — Importação de extrato (spec 11, fases B e C). O arquivo é lido no navegador; aqui
-- ficam as linhas do banco (deduplicadas por conta + FITID), o registro de cada importação
-- e as regras de categoria que aprendem. Classificar cria o lançamento no livro e liga por
-- journal_entry_id. Tudo gated por finance.manage, como o resto do financeiro.
-- Reverter: drop table category_rules, bank_transactions, bank_imports;
-- alter table ledger_accounts drop column statement_acct_id.

-- Número da conta como aparece no OFX (ACCTID): a próxima importação escolhe a conta sozinha.
alter table public.ledger_accounts add column if not exists statement_acct_id text;

create table if not exists public.bank_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.ledger_accounts(id) on delete cascade,
  filename text not null,
  format text not null check (format in ('ofx', 'ofc', 'csv')),
  period_start date,
  period_end date,
  total_rows int not null default 0,
  new_rows int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_bank_imports_org on public.bank_imports(org_id, created_at desc);
create index if not exists idx_bank_imports_account on public.bank_imports(account_id);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.ledger_accounts(id) on delete cascade,
  import_id uuid references public.bank_imports(id) on delete set null,
  fitid text not null,
  posted_at date not null,
  amount numeric(14,2) not null check (amount <> 0), -- negativo = saída
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'classified', 'ignored')),
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bank_transactions_dedup unique (account_id, fitid)
);
create index if not exists idx_bank_transactions_org_status on public.bank_transactions(org_id, status, posted_at);
create index if not exists idx_bank_transactions_import on public.bank_transactions(import_id);
create index if not exists idx_bank_transactions_entry on public.bank_transactions(journal_entry_id);

create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  pattern text not null, -- trecho da descrição, sem acento e minúsculo
  account_id uuid not null references public.ledger_accounts(id) on delete cascade, -- categoria
  hits int not null default 0,
  created_at timestamptz not null default now(),
  constraint category_rules_unique unique (org_id, pattern)
);
create index if not exists idx_category_rules_account on public.category_rules(account_id);

alter table public.bank_imports enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.category_rules enable row level security;

drop policy if exists bank_imports_all on public.bank_imports;
create policy bank_imports_all on public.bank_imports for all
  using (has_perm(org_id, 'finance.manage')) with check (has_perm(org_id, 'finance.manage'));
drop policy if exists bank_transactions_all on public.bank_transactions;
create policy bank_transactions_all on public.bank_transactions for all
  using (has_perm(org_id, 'finance.manage')) with check (has_perm(org_id, 'finance.manage'));
drop policy if exists category_rules_all on public.category_rules;
create policy category_rules_all on public.category_rules for all
  using (has_perm(org_id, 'finance.manage')) with check (has_perm(org_id, 'finance.manage'));
