-- Giving — Fase 1: doações atribuídas a doador + recibos/declarações (BR/US).
-- RLS mais rígido que o finance geral: acesso por finance.manage (dado sensível de doador).

-- Doações (ledger de giving, nível doador). Doador = Stick opcional (null = anônimo/avulso).
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  stick_id uuid references public.sticks(id) on delete set null,
  donor_name text,               -- snapshot / doador sem Stick
  donor_tax_id text,             -- CPF (BR) p/ o recibo; opcional
  fund_id uuid references public.funds(id) on delete set null,
  amount numeric not null check (amount > 0),
  currency text not null default 'BRL',
  method text not null default 'dinheiro'
    check (method in ('dinheiro','pix','cartao','transferencia','cheque','outro')),
  donation_date date not null default current_date,
  note text,
  goods_services_provided boolean not null default false,  -- US quid pro quo
  goods_services_description text,
  goods_services_value numeric,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists donations_org_date_idx on public.donations(org_id, donation_date);
create index if not exists donations_org_stick_idx on public.donations(org_id, stick_id);
create index if not exists donations_org_fund_idx on public.donations(org_id, fund_id);
alter table public.donations enable row level security;
create policy donations_rw on public.donations
  for all using (public.has_perm(org_id, 'finance.manage'))
  with check (public.has_perm(org_id, 'finance.manage'));

-- Recibos emitidos (por doação ou declaração anual). Guardam snapshot imutável dos dados.
create table if not exists public.donation_receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('gift','annual')),
  donation_id uuid references public.donations(id) on delete set null,  -- kind='gift'
  stick_id uuid references public.sticks(id) on delete set null,        -- doador
  period_year int,                                                      -- kind='annual'
  receipt_no text not null,
  country text not null default 'BR' check (country in ('BR','US')),
  total_amount numeric not null default 0,
  currency text not null default 'BRL',
  snapshot jsonb not null default '{}'::jsonb,  -- dados congelados no momento da emissão
  issued_at timestamptz not null default now(),
  created_by uuid,
  unique (org_id, receipt_no)
);
create index if not exists receipts_org_stick_idx on public.donation_receipts(org_id, stick_id);
alter table public.donation_receipts enable row level security;
create policy receipts_rw on public.donation_receipts
  for all using (public.has_perm(org_id, 'finance.manage'))
  with check (public.has_perm(org_id, 'finance.manage'));

-- Próximo número de recibo por org, sequência por ANO: 'YYYY-000001'. Gated por finance.manage.
create or replace function public.next_receipt_number(p_org uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_year int := extract(year from now())::int; v_n int;
begin
  if not public.has_perm(p_org, 'finance.manage') then
    raise exception 'Sem permissão para emitir recibos nesta organização.';
  end if;
  select count(*) + 1 into v_n
    from public.donation_receipts r
    where r.org_id = p_org and r.receipt_no like v_year::text || '-%';
  return v_year::text || '-' || lpad(v_n::text, 6, '0');
end $$;
