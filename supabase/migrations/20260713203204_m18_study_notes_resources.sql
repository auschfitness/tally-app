-- Step 5 · Fase 4 (Notas & Recursos)

create table if not exists public.study_notes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  author_id     uuid,
  title         text,
  content       text,
  scope         text not null default 'personal',   -- 'personal' | 'shared' (refino de visibilidade fina é futuro)
  sermon_id     uuid references public.sermons(id) on delete set null,
  series_id     uuid references public.series(id) on delete set null,
  scripture_ref text,
  topic         text,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists study_notes_org_idx    on public.study_notes (org_id);
create index if not exists study_notes_sermon_idx  on public.study_notes (sermon_id);

create table if not exists public.resources (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  title        text not null,
  author       text,
  type         text,               -- book/article/pdf/link/video/quote/doc/other
  url          text,
  description  text,
  topic        text,
  tags         text[] not null default '{}',
  sermon_id    uuid references public.sermons(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists resources_org_idx on public.resources (org_id);

alter table public.study_notes enable row level security;
alter table public.resources   enable row level security;

drop policy if exists study_notes_rw on public.study_notes;
create policy study_notes_rw on public.study_notes
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists resources_rw on public.resources;
create policy resources_rw on public.resources
  for all to authenticated using (is_org_member(org_id)) with check (is_org_member(org_id));
