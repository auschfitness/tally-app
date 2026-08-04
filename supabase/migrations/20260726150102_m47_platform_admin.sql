-- m47 — Painel admin da PLATAFORMA (Tally sobre todas as igrejas).
-- Design de seguranca: NAO afrouxamos o RLS das tabelas. O super-admin le por FUNCOES
-- agregadas SECURITY DEFINER, liberadas so a quem esta em platform_admins. Dado cru e
-- sensivel (doacoes/mensagens/Care) continua protegido pelo RLS por-org.

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

-- Quem e admin da plataforma? SECURITY DEFINER le a tabela ignorando o RLS dela (sem recursao).
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- So um platform-admin gerencia a lista (e a ve). Bootstrap inicial via SQL abaixo.
create policy platform_admins_select on public.platform_admins for select using (is_platform_admin());
create policy platform_admins_insert on public.platform_admins for insert with check (is_platform_admin());
create policy platform_admins_delete on public.platform_admins for delete using (is_platform_admin());

-- Ciclo de vida da org (provisionar/suspender) + trilho de plano (base do white-label).
alter table public.organizations
  add column status text not null default 'active' check (status in ('active','suspended'));
alter table public.organizations
  add column plan text not null default 'free';

-- Lista de igrejas com metricas para o painel. So agregados/metadados, sem linha sensivel.
create or replace function public.admin_list_orgs()
returns table (
  org_id uuid, name text, country text, currency text, status text, plan text,
  created_at timestamptz, members bigint, sticks bigint, groups bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select o.id, o.name, o.country, o.currency, o.status, o.plan, o.created_at,
           (select count(*) from public.memberships m where m.org_id = o.id),
           (select count(*) from public.sticks s where s.org_id = o.id),
           (select count(*) from public.groups g where g.org_id = o.id)
    from public.organizations o
    order by o.created_at;
end;
$$;

-- Totais da plataforma (cabecalho do painel).
create or replace function public.admin_platform_stats()
returns table (orgs bigint, members bigint, sticks bigint, active bigint, suspended bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select
    (select count(*) from public.organizations),
    (select count(*) from public.memberships),
    (select count(*) from public.sticks),
    (select count(*) from public.organizations where status = 'active'),
    (select count(*) from public.organizations where status = 'suspended');
end;
$$;

-- Suspender/reativar uma igreja (o front bloqueia login de org suspensa).
create or replace function public.admin_set_org_status(p_org uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('active','suspended') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.organizations set status = p_status where id = p_org;
end;
$$;

-- Fechar o acesso: essas funcoes so por usuario logado (a checagem interna e a barreira real).
revoke execute on function public.admin_list_orgs() from public, anon;
revoke execute on function public.admin_platform_stats() from public, anon;
revoke execute on function public.admin_set_org_status(uuid, text) from public, anon;
grant execute on function public.admin_list_orgs() to authenticated;
grant execute on function public.admin_platform_stats() to authenticated;
grant execute on function public.admin_set_org_status(uuid, text) to authenticated;

-- Bootstrap: Gaybiel (fundador) vira o primeiro platform-admin.
insert into public.platform_admins (user_id, note)
values ('b04376ab-8ce1-4fe9-bf54-fa91df31264d', 'Gaybiel (fundador Tally) - bootstrap')
on conflict (user_id) do nothing;
