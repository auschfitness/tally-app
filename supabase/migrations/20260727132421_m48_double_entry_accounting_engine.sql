-- m48 — Motor de contabilidade por partidas dobradas (financeiro completo).
-- Plano de contas + lancamentos (journal entries) com partidas (journal lines) debito/credito.
-- Regras: rascunho editavel; ao POSTAR, soma(debito)=soma(credito) e >=2 partidas; lancamento
-- postado e imutavel (estorna-se via void). Tudo gated por finance.manage (dado sensivel).
-- Coexiste com o Finance Lite (finance_entries) — migracao de dados antigos e passo posterior.

create type ledger_account_type as enum ('asset','liability','equity','revenue','expense');
create type journal_status as enum ('draft','posted','void');

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  type ledger_account_type not null,
  parent_id uuid references public.ledger_accounts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ledger_accounts_code_unique unique (org_id, code)
);
create index ledger_accounts_org_idx on public.ledger_accounts(org_id);
create index ledger_accounts_parent_idx on public.ledger_accounts(parent_id);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entry_date date not null,
  memo text,
  reference text,
  status journal_status not null default 'draft',
  fund_id uuid references public.funds(id) on delete set null,
  reverses_entry_id uuid references public.journal_entries(id) on delete set null,
  created_by uuid references auth.users(id),
  posted_at timestamptz,
  created_at timestamptz not null default now()
);
create index journal_entries_org_date_idx on public.journal_entries(org_id, entry_date);
create index journal_entries_status_idx on public.journal_entries(org_id, status);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.ledger_accounts(id),
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  fund_id uuid references public.funds(id) on delete set null,
  description text,
  line_no integer not null default 0,
  constraint journal_lines_nonneg check (debit >= 0 and credit >= 0),
  constraint journal_lines_one_side check ((debit = 0) <> (credit = 0))
);
create index journal_lines_entry_idx on public.journal_lines(entry_id);
create index journal_lines_account_idx on public.journal_lines(account_id);
create index journal_lines_org_idx on public.journal_lines(org_id);

create or replace function public.guard_journal_line_draft()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status journal_status;
begin
  select status into v_status from public.journal_entries
    where id = coalesce(new.entry_id, old.entry_id);
  if v_status is distinct from 'draft' then
    raise exception 'lancamento nao-rascunho e imutavel (estorne via void)' using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger journal_lines_guard
before insert or update or delete on public.journal_lines
for each row execute function public.guard_journal_line_draft();

create or replace function public.post_journal_entry(p_entry uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status journal_status; v_n int; v_deb numeric; v_cred numeric;
begin
  select org_id, status into v_org, v_status from public.journal_entries where id = p_entry;
  if v_org is null then raise exception 'lancamento inexistente' using errcode='22023'; end if;
  if not has_perm(v_org,'finance.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  if v_status <> 'draft' then raise exception 'so rascunho pode ser postado' using errcode='55000'; end if;
  select count(*), coalesce(sum(debit),0), coalesce(sum(credit),0)
    into v_n, v_deb, v_cred from public.journal_lines where entry_id = p_entry;
  if v_n < 2 then raise exception 'lancamento precisa de ao menos 2 partidas' using errcode='22023'; end if;
  if v_deb <> v_cred then raise exception 'debitos (%) e creditos (%) nao batem', v_deb, v_cred using errcode='22023'; end if;
  if v_deb = 0 then raise exception 'lancamento com valor zero' using errcode='22023'; end if;
  update public.journal_entries set status='posted', posted_at=now() where id = p_entry;
end;
$$;

create or replace function public.void_journal_entry(p_entry uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status journal_status;
begin
  select org_id, status into v_org, v_status from public.journal_entries where id = p_entry;
  if v_org is null then raise exception 'lancamento inexistente' using errcode='22023'; end if;
  if not has_perm(v_org,'finance.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  if v_status <> 'posted' then raise exception 'so lancamento postado pode ser anulado' using errcode='55000'; end if;
  update public.journal_entries set status='void' where id = p_entry;
end;
$$;

create or replace function public.trial_balance(p_org uuid, p_as_of date default null)
returns table (account_id uuid, code text, name text, type ledger_account_type,
               debit numeric, credit numeric, balance numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_perm(p_org,'finance.manage') then raise exception 'forbidden' using errcode='42501'; end if;
  return query
    select a.id, a.code, a.name, a.type,
           coalesce(sum(l.debit),0), coalesce(sum(l.credit),0),
           case when a.type in ('asset','expense')
                then coalesce(sum(l.debit),0) - coalesce(sum(l.credit),0)
                else coalesce(sum(l.credit),0) - coalesce(sum(l.debit),0) end
    from public.ledger_accounts a
    left join public.journal_lines l on l.account_id = a.id
    left join public.journal_entries e on e.id = l.entry_id
       and e.status = 'posted'
       and (p_as_of is null or e.entry_date <= p_as_of)
    where a.org_id = p_org
    group by a.id, a.code, a.name, a.type
    order by a.code;
end;
$$;

alter table public.ledger_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

create policy ledger_accounts_all on public.ledger_accounts for all
  using (has_perm(org_id,'finance.manage')) with check (has_perm(org_id,'finance.manage'));
create policy journal_entries_all on public.journal_entries for all
  using (has_perm(org_id,'finance.manage')) with check (has_perm(org_id,'finance.manage'));
create policy journal_lines_all on public.journal_lines for all
  using (has_perm(org_id,'finance.manage')) with check (has_perm(org_id,'finance.manage'));

revoke execute on function public.post_journal_entry(uuid) from public, anon;
revoke execute on function public.void_journal_entry(uuid) from public, anon;
revoke execute on function public.trial_balance(uuid, date) from public, anon;
grant execute on function public.post_journal_entry(uuid) to authenticated;
grant execute on function public.void_journal_entry(uuid) to authenticated;
grant execute on function public.trial_balance(uuid, date) to authenticated;
