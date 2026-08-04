-- Step 6 · Serviços, Eventos, Calendário (estende services/events + 2 tabelas novas)

-- estender services (culto recorrente)
alter table public.services
  add column if not exists description       text,
  add column if not exists type              text,   -- Sunday Gathering/Prayer/Youth/Children/Small Group/Other
  add column if not exists recurring_pattern text,   -- weekly/monthly/custom
  add column if not exists location          text,
  add column if not exists end_time          text,
  add column if not exists active            boolean not null default true;

-- estender events (gathering especial)
alter table public.events
  add column if not exists description           text,
  add column if not exists type                  text,
  add column if not exists cover_image           text,
  add column if not exists end_time              timestamptz,
  add column if not exists location              text,
  add column if not exists capacity              int,
  add column if not exists registration_required boolean not null default false,
  add column if not exists payment_required      boolean not null default false,
  add column if not exists check_in_enabled      boolean not null default false,
  add column if not exists status                text not null default 'active',
  add column if not exists created_by            uuid;

-- order of service (plano do culto)
create table if not exists public.service_plan_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  service_id   uuid references public.services(id) on delete cascade,
  session_id   uuid references public.attendance_sessions(id) on delete cascade,
  position     int not null default 1,
  time_label   text,
  title        text not null,
  duration_min int,
  responsible  text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists service_plan_org_idx     on public.service_plan_items (org_id);
create index if not exists service_plan_service_idx on public.service_plan_items (service_id);

-- inscrições em eventos (gestão interna; página pública/anon fica pra rodada dedicada)
create table if not exists public.event_registrations (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  event_id       uuid not null references public.events(id) on delete cascade,
  stick_id       uuid references public.sticks(id) on delete set null,
  name           text,
  email          text,
  phone          text,
  household      text,
  answers        jsonb not null default '{}'::jsonb,
  payment_status text,
  checked_in     boolean not null default false,
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists event_reg_org_idx   on public.event_registrations (org_id);
create index if not exists event_reg_event_idx on public.event_registrations (event_id);

-- RLS
alter table public.service_plan_items  enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists service_plan_items_rw on public.service_plan_items;
create policy service_plan_items_rw on public.service_plan_items for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists event_registrations_rw on public.event_registrations;
create policy event_registrations_rw on public.event_registrations for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
