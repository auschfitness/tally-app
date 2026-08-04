-- Step 5 · Fase 2 (Series)

do $$ begin
  create type public.series_status as enum ('planning','active','completed','archived');
exception when duplicate_object then null; end $$;

create table if not exists public.series (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  description text,
  theme       text,
  cover_image text,
  start_date  date,
  end_date    date,
  status      public.series_status not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists series_org_idx on public.series (org_id);

alter table public.sermons
  drop constraint if exists sermons_series_id_fkey,
  add  constraint sermons_series_id_fkey
       foreign key (series_id) references public.series(id) on delete set null;

alter table public.series enable row level security;

drop policy if exists series_rw on public.series;
create policy series_rw on public.series
  for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
