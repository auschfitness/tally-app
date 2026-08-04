-- Step 4 · Fase 1 (Journey)

-- 1) journeys (tabela-pai)
create table if not exists public.journeys (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists journeys_one_default_per_org
  on public.journeys (org_id) where is_default;

-- 2) enriquecer journey_stages
alter table public.journey_stages
  add column if not exists journey_id           uuid references public.journeys(id) on delete cascade,
  add column if not exists description          text,
  add column if not exists color                text,
  add column if not exists required_milestones  uuid[] not null default '{}',
  add column if not exists recommended_actions  jsonb  not null default '[]'::jsonb;

-- 3) stick_journey_records
create table if not exists public.stick_journey_records (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  stick_id          uuid not null references public.sticks(id) on delete cascade,
  journey_id        uuid not null references public.journeys(id) on delete cascade,
  current_stage_id  uuid references public.journey_stages(id),
  previous_stage_id uuid references public.journey_stages(id),
  entered_stage_at  timestamptz not null default now(),
  completed_stages  uuid[] not null default '{}',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (stick_id, journey_id)
);
create index if not exists sjr_stick_idx   on public.stick_journey_records (stick_id);
create index if not exists sjr_journey_idx on public.stick_journey_records (journey_id);

-- 4) RLS (restrito a authenticated, como as demais)
alter table public.journeys              enable row level security;
alter table public.stick_journey_records enable row level security;

drop policy if exists journeys_rw on public.journeys;
create policy journeys_rw on public.journeys
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists sjr_rw on public.stick_journey_records;
create policy sjr_rw on public.stick_journey_records
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));

-- 5) Backfill orgs existentes: 1 journey padrão por org + liga estágios atuais
insert into public.journeys (org_id, name, description, is_default)
select o.id, 'Jornada padrão', 'Caminho operacional da pessoa pela vida da igreja.', true
from public.organizations o
where not exists (select 1 from public.journeys j where j.org_id = o.id and j.is_default);

update public.journey_stages s
set journey_id = j.id
from public.journeys j
where j.org_id = s.org_id and j.is_default and s.journey_id is null;

-- 5b) Semear os 6 estágios padrão para orgs cuja journey padrão está sem estágios
insert into public.journey_stages (org_id, journey_id, name, position)
select j.org_id, j.id, x.name, x.pos
from public.journeys j
cross join (values
  ('Primeira visita',1),('Retornou',2),('Conectado',3),
  ('Em grupo',4),('Servindo',5),('Liderança',6)
) as x(name,pos)
where j.is_default
  and not exists (select 1 from public.journey_stages s where s.journey_id = j.id);

-- 6) create_org passa a semear journey padrão + 6 estágios (fecha o follow-up)
create or replace function public.create_org(p_name text, p_currency text, p_campus text, p_state jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid; v_uid uuid; v_journey uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Usuário não autenticado: o token do login não chegou ao banco.';
  end if;
  insert into organizations(name, currency)
    values (coalesce(nullif(p_name,''),'Minha igreja'), coalesce(nullif(p_currency,''),'BRL'))
    returning id into v_org;
  insert into memberships(org_id, user_id, role, is_owner) values (v_org, v_uid, 'owner', true);
  insert into campuses(org_id, name) values (v_org, coalesce(nullif(p_campus,''),'Sede'));
  insert into app_state(org_id, data, updated_by) values (v_org, coalesce(p_state, '{}'::jsonb), v_uid)
    on conflict (org_id) do update set data = excluded.data, updated_at = now();
  -- journey padrão + estágios
  insert into journeys(org_id, name, description, is_default)
    values (v_org, 'Jornada padrão', 'Caminho operacional da pessoa pela vida da igreja.', true)
    returning id into v_journey;
  insert into journey_stages(org_id, journey_id, name, position)
    select v_org, v_journey, x.name, x.pos
    from (values
      ('Primeira visita',1),('Retornou',2),('Conectado',3),
      ('Em grupo',4),('Servindo',5),('Liderança',6)
    ) as x(name,pos);
  return v_org;
end $function$;
