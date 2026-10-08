-- m64 — Contas a pagar e a receber (spec 12, fase A).
-- Uma conta é uma PROMESSA: não toca o livro. Só ao pagar vira lançamento, pela
-- record_transaction de sempre (pay_bill). Conta que se repete = série; as ocorrências são
-- materializadas (seq 0, 1, 2…) e a série guarda a próxima seq a gerar, para uma ocorrência
-- apagada não voltar.

create table if not exists public.finance_bill_series (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  anchor_date date not null,          -- 1ª ocorrência; o dia do mês vem dela (31 → último dia)
  ends_on date,
  next_seq int not null default 0,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.finance_bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  series_id uuid references public.finance_bill_series(id) on delete set null,
  seq int,
  kind text not null check (kind in ('in', 'out')),
  description text not null check (length(trim(description)) > 0),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  category_id uuid not null references public.ledger_accounts(id),
  account_id uuid references public.ledger_accounts(id) on delete set null,
  payee text,
  notes text,
  status text not null default 'open' check (status in ('open', 'paid')),
  paid_on date,
  paid_amount numeric(14,2),
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_bills_series_seq unique (series_id, seq)
);
create index if not exists idx_finance_bills_org_due on public.finance_bills(org_id, status, due_date);
create index if not exists idx_finance_bills_entry on public.finance_bills(journal_entry_id);

alter table public.finance_bill_series enable row level security;
alter table public.finance_bills enable row level security;

drop policy if exists finance_bill_series_all on public.finance_bill_series;
create policy finance_bill_series_all on public.finance_bill_series for all
  using (has_perm(org_id, 'finance.manage')) with check (has_perm(org_id, 'finance.manage'));
drop policy if exists finance_bills_all on public.finance_bills;
create policy finance_bills_all on public.finance_bills for all
  using (has_perm(org_id, 'finance.manage')) with check (has_perm(org_id, 'finance.manage'));

-- Pagar: cria o lançamento e marca a conta como paga, numa transação só. Valor e data
-- podem diferir do previsto (a luz veio mais cara).
create or replace function public.pay_bill(p_bill uuid, p_date date, p_account uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b public.finance_bills%rowtype;
  v_entry uuid;
begin
  select * into b from public.finance_bills where id = p_bill for update;
  if b.id is null then raise exception 'conta inexistente' using errcode = '22023'; end if;
  if not has_perm(b.org_id, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'open' then raise exception 'conta ja paga' using errcode = '55000'; end if;

  v_entry := public.record_transaction(b.org_id, b.kind, p_amount, p_date, p_account, b.category_id, b.description);

  update public.finance_bills
     set status = 'paid', paid_on = p_date, paid_amount = round(p_amount, 2),
         journal_entry_id = v_entry, updated_at = now()
   where id = p_bill;
  return v_entry;
end;
$$;

-- Desfazer o pagamento: anula o lançamento e a conta volta a ficar aberta.
create or replace function public.unpay_bill(p_bill uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.finance_bills%rowtype;
begin
  select * into b from public.finance_bills where id = p_bill for update;
  if b.id is null then raise exception 'conta inexistente' using errcode = '22023'; end if;
  if not has_perm(b.org_id, 'finance.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.status <> 'paid' then return; end if;

  if b.journal_entry_id is not null
     and exists (select 1 from public.journal_entries where id = b.journal_entry_id and status = 'posted') then
    perform public.void_journal_entry(b.journal_entry_id);
  end if;

  update public.finance_bills
     set status = 'open', paid_on = null, paid_amount = null, journal_entry_id = null, updated_at = now()
   where id = p_bill;
end;
$$;

revoke execute on function public.pay_bill(uuid, date, uuid, numeric) from public, anon;
revoke execute on function public.unpay_bill(uuid) from public, anon;
grant execute on function public.pay_bill(uuid, date, uuid, numeric) to authenticated;
grant execute on function public.unpay_bill(uuid) to authenticated;
