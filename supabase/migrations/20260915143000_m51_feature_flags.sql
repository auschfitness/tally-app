-- m51 — Feature flags (gate de MATURIDADE: "esta pronto?").
-- Ortogonal ao plano (gate COMERCIAL: "pagou?", organizations.plan, m47/m50). Um modulo so
-- aparece se flag ligada E plano permite, nessa ordem. Nem flag nem plano sao fronteira de
-- seguranca: o isolamento entre igrejas continua imposto pelo RLS das tabelas de dados.
-- Ver docs/specs/00-fundacao.md (Parte A).

create table public.feature_flags (
  key          text primary key,                 -- 'finance.ofx_import'
  description  text not null,
  enabled      boolean not null default false,   -- default global
  rollout      text not null default 'off' check (rollout in ('off','orgs','all')),
  created_at   timestamptz not null default now()
);
alter table public.feature_flags enable row level security;

create table public.feature_flag_orgs (
  flag_key text not null references public.feature_flags(key) on delete cascade,
  org_id   uuid not null references public.organizations(id) on delete cascade,
  enabled  boolean not null default true,
  primary key (flag_key, org_id)
);
alter table public.feature_flag_orgs enable row level security;

-- RLS: LEITURA liberada (o app precisa saber o que renderizar); ESCRITA so platform admin.
-- feature_flags nao tem org_id (e o catalogo global), entao basta estar logado.
create policy feature_flags_select on public.feature_flags
  for select using ((select auth.uid()) is not null);
create policy feature_flags_write on public.feature_flags
  for all using (is_platform_admin()) with check (is_platform_admin());

-- Override por org: o membro le o da propria igreja; o platform admin le todos (painel).
create policy feature_flag_orgs_select on public.feature_flag_orgs
  for select using (is_org_member(org_id) or is_platform_admin());
create policy feature_flag_orgs_write on public.feature_flag_orgs
  for all using (is_platform_admin()) with check (is_platform_admin());

-- Todas as flags LIGADAS para uma org, de uma vez (o app carrega uma vez por request, nunca
-- uma query por flag). Precedencia: override por org vence; senao rollout='all' e enabled;
-- senao false. SECURITY DEFINER le as tabelas ignorando o RLS, entao a funcao confere ela
-- mesma que o chamador e membro da org — sem isso daria para ler flag de igreja alheia.
create or replace function public.org_flags(p_org uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select case when public.is_org_member(p_org) then coalesce((
    select array_agg(f.key)
    from public.feature_flags f
    left join public.feature_flag_orgs o on o.flag_key = f.key and o.org_id = p_org
    where coalesce(o.enabled, f.rollout = 'all' and f.enabled)
  ), '{}'::text[]) else '{}'::text[] end;
$$;

-- Uma flag so. Derivada de org_flags para a precedencia viver num lugar unico.
create or replace function public.flag_on(p_key text, p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_key = any(public.org_flags(p_org));
$$;

-- Painel: ligar/desligar a flag no global (default de todas as orgs).
create or replace function public.admin_set_flag(p_key text, p_enabled boolean, p_rollout text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_rollout not in ('off','orgs','all') then raise exception 'invalid_rollout' using errcode='22023'; end if;
  update public.feature_flags set enabled = p_enabled, rollout = p_rollout where key = p_key;
  if not found then raise exception 'unknown_flag' using errcode='22023'; end if;
end;
$$;

-- Painel: override para UMA igreja (o caminho normal — ligar na org de teste, validar, depois 'all').
create or replace function public.admin_set_flag_org(p_key text, p_org uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.feature_flag_orgs (flag_key, org_id, enabled)
  values (p_key, p_org, p_enabled)
  on conflict (flag_key, org_id) do update set enabled = excluded.enabled;
end;
$$;

-- Fechar o acesso: so usuario logado (a checagem interna de cada funcao e a barreira real).
revoke execute on function public.org_flags(uuid) from public, anon;
revoke execute on function public.flag_on(text, uuid) from public, anon;
revoke execute on function public.admin_set_flag(text, boolean, text) from public, anon;
revoke execute on function public.admin_set_flag_org(text, uuid, boolean) from public, anon;
grant execute on function public.org_flags(uuid) to authenticated;
grant execute on function public.flag_on(text, uuid) to authenticated;
grant execute on function public.admin_set_flag(text, boolean, text) to authenticated;
grant execute on function public.admin_set_flag_org(text, uuid, boolean) to authenticated;

-- O catalogo de chaves (fonte da verdade tipada vive em src/features/flags/catalog.ts).
-- Toda flag nasce rollout='off' + enabled=false: nao existe para ninguem ate ser ligada.
-- Idempotente: reaplicar a migration nao sobrescreve o que ja foi ligado no painel.
insert into public.feature_flags (key, description) values
  ('finance.ofx_import', 'Importação de extrato bancário OFX no Financeiro'),
  ('finance.v2',         'Financeiro reformulado (v2)'),
  ('study.bible_v2',     'Estudo bíblico reformulado (v2)'),
  ('study.interlinear',  'Interlinear grego/hebraico no Estudo'),
  ('teams.v2',           'Times/Escalas reformulado (v2)'),
  ('groups.v2',          'Grupos/Células reformulado (v2)'),
  ('billing.checkout',   'Checkout e cobrança de planos'),
  ('ui.design_v2',       'Sistema de design v2 (novos tokens)')
on conflict (key) do nothing;
