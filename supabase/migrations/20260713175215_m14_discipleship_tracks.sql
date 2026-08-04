-- Step 4 · Fase 5 (Discipleship Tracks)

create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  description text,
  type        text,
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists tracks_org_idx on public.tracks (org_id);

create table if not exists public.track_steps (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  track_id    uuid not null references public.tracks(id) on delete cascade,
  name        text not null,
  description text,
  position    int  not null default 1,
  materials   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists track_steps_track_idx on public.track_steps (track_id);

create table if not exists public.track_enrollments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  track_id        uuid not null references public.tracks(id) on delete cascade,
  stick_id        uuid not null references public.sticks(id) on delete cascade,
  current_step_id uuid references public.track_steps(id) on delete set null,
  progress        int  not null default 0,
  status          text not null default 'in_progress',
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (track_id, stick_id)
);
create index if not exists track_enrollments_stick_idx on public.track_enrollments (stick_id);
create index if not exists track_enrollments_track_idx on public.track_enrollments (track_id);

alter table public.tracks            enable row level security;
alter table public.track_steps       enable row level security;
alter table public.track_enrollments enable row level security;

drop policy if exists tracks_rw on public.tracks;
create policy tracks_rw on public.tracks
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists track_steps_rw on public.track_steps;
create policy track_steps_rw on public.track_steps
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists track_enrollments_rw on public.track_enrollments;
create policy track_enrollments_rw on public.track_enrollments
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));
