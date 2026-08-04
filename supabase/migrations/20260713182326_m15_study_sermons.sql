-- Step 5 · Fase 1 (Study: Sermon + Library + editor básico)

do $$ begin
  create type public.sermon_status as enum ('draft','preparing','ready','preached','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sermon_visibility as enum ('private','leadership','church','public');
exception when duplicate_object then null; end $$;

create table if not exists public.sermons (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  title        text not null,
  subtitle     text,
  description  text,
  preacher_id  uuid,
  series_id    uuid,
  campus_id    uuid references public.campuses(id) on delete set null,
  service_id   uuid,
  sermon_date  date,
  status       public.sermon_status     not null default 'draft',
  visibility   public.sermon_visibility not null default 'church',
  main_passage text,
  big_idea     text,
  content      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sermons_org_idx    on public.sermons (org_id);
create index if not exists sermons_status_idx  on public.sermons (org_id, status);
create index if not exists sermons_date_idx    on public.sermons (org_id, sermon_date);

alter table public.sermons enable row level security;

drop policy if exists sermons_rw on public.sermons;
create policy sermons_rw on public.sermons
  for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
