-- Step 7 · Teams, Volunteers & Ministries (schema das fases 1-3; fases 4-6 são front)

-- 1) ministries
create table if not exists public.ministries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  campus_id   uuid references public.campuses(id) on delete set null,
  name        text not null,
  description text,
  leader_id   uuid references public.sticks(id) on delete set null,
  color       text,
  status      text not null default 'active',   -- active | inactive | archived
  created_at  timestamptz not null default now()
);
create index if not exists ministries_org_idx on public.ministries (org_id);

-- 2) teams (um time pertence a um ministério; roles de serviço como jsonb)
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  ministry_id   uuid references public.ministries(id) on delete cascade,
  campus_id     uuid references public.campuses(id) on delete set null,
  name          text not null,
  description   text,
  leader_id     uuid references public.sticks(id) on delete set null,
  serving_roles jsonb not null default '[]'::jsonb,   -- ex.: ["Recepcionista","Anfitrião"]
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);
create index if not exists teams_org_idx      on public.teams (org_id);
create index if not exists teams_ministry_idx on public.teams (ministry_id);

-- 3) team_members (relação de serviço Stick ↔ Team) — distinto de group_members
create table if not exists public.team_members (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  team_id      uuid not null references public.teams(id) on delete cascade,
  stick_id     uuid not null references public.sticks(id) on delete cascade,
  role         text,
  status       text not null default 'active',   -- active | paused | inactive
  availability text,
  joined_at    date,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (team_id, stick_id)
);
create index if not exists team_members_team_idx  on public.team_members (team_id);
create index if not exists team_members_stick_idx on public.team_members (stick_id);

-- 4) schedule_assignments (escala: serviço/evento → time → papel → Stick)
create table if not exists public.schedule_assignments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  service_id      uuid references public.services(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete set null,
  role            text,
  stick_id        uuid references public.sticks(id) on delete set null,
  assignment_date date,
  status          text not null default 'assigned',  -- assigned | confirmed | declined | replacement_needed | completed
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists sched_org_date_idx on public.schedule_assignments (org_id, assignment_date);
create index if not exists sched_team_idx     on public.schedule_assignments (team_id);

-- RLS: isolamento por org nas quatro
alter table public.ministries           enable row level security;
alter table public.teams                enable row level security;
alter table public.team_members         enable row level security;
alter table public.schedule_assignments enable row level security;

drop policy if exists ministries_rw on public.ministries;
create policy ministries_rw on public.ministries for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists teams_rw on public.teams;
create policy teams_rw on public.teams for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists team_members_rw on public.team_members;
create policy team_members_rw on public.team_members for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists schedule_assignments_rw on public.schedule_assignments;
create policy schedule_assignments_rw on public.schedule_assignments for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
