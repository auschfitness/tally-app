-- Onda 1 / A1: dados jurídicos-fiscais da organização (matriz) e por campus (filial).
-- Decisão do dono: cada filial tem CNPJ próprio; escrita = pastor/administrativo/tesoureiro.

-- Helper de escrita: dono (is_owner via has_perm) OU org.manage (administrativo) OU finance.manage (tesoureiro).
create or replace function public.can_manage_org_fiscal(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.has_perm(p_org, 'org.manage') or public.has_perm(p_org, 'finance.manage');
$$;

-- Trigger utilitário p/ updated_at
create or replace function public.fiscal_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Fiscal da organização (matriz) — 1:1 com organizations
create table if not exists public.org_fiscal_profiles (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  country text not null default 'BR' check (country in ('BR','US')),
  legal_name text,
  trade_name text,
  tax_id text,
  state_registration text,
  tax_exempt_status text,
  fiscal_address jsonb not null default '{}'::jsonb,
  bank_info jsonb not null default '{}'::jsonb,
  pix_key text,
  donation_compliance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.org_fiscal_profiles enable row level security;

create policy org_fiscal_select on public.org_fiscal_profiles
  for select using (public.is_org_member(org_id));
create policy org_fiscal_insert on public.org_fiscal_profiles
  for insert with check (public.can_manage_org_fiscal(org_id));
create policy org_fiscal_update on public.org_fiscal_profiles
  for update using (public.can_manage_org_fiscal(org_id)) with check (public.can_manage_org_fiscal(org_id));
create policy org_fiscal_delete on public.org_fiscal_profiles
  for delete using (public.can_manage_org_fiscal(org_id));

create trigger org_fiscal_touch before update on public.org_fiscal_profiles
  for each row execute function public.fiscal_set_updated_at();

-- Fiscal por campus (filial com CNPJ próprio) — 1:1 com campuses
create table if not exists public.campus_fiscal_profiles (
  campus_id uuid primary key references public.campuses(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  country text not null default 'BR' check (country in ('BR','US')),
  legal_name text,
  trade_name text,
  tax_id text,
  state_registration text,
  tax_exempt_status text,
  fiscal_address jsonb not null default '{}'::jsonb,
  bank_info jsonb not null default '{}'::jsonb,
  pix_key text,
  donation_compliance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists campus_fiscal_org_idx on public.campus_fiscal_profiles(org_id);
alter table public.campus_fiscal_profiles enable row level security;

create policy campus_fiscal_select on public.campus_fiscal_profiles
  for select using (public.is_org_member(org_id));
create policy campus_fiscal_insert on public.campus_fiscal_profiles
  for insert with check (public.can_manage_org_fiscal(org_id));
create policy campus_fiscal_update on public.campus_fiscal_profiles
  for update using (public.can_manage_org_fiscal(org_id)) with check (public.can_manage_org_fiscal(org_id));
create policy campus_fiscal_delete on public.campus_fiscal_profiles
  for delete using (public.can_manage_org_fiscal(org_id));

create trigger campus_fiscal_touch before update on public.campus_fiscal_profiles
  for each row execute function public.fiscal_set_updated_at();

-- Nova permissão administrativa 'org.manage' semeada nos papéis de sistema Pastor
-- (dono já passa via is_owner; tesoureiro via finance.manage). Aditivo e idempotente.
update public.roles
  set permissions = (select array(select distinct unnest(permissions || array['org.manage'])))
  where is_system = true and name = 'Pastor' and not (permissions @> array['org.manage']);
