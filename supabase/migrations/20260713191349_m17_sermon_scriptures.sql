-- Step 5 · Fase 3 (Escritura) — sermon_scriptures

create table if not exists public.sermon_scriptures (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  sermon_id    uuid not null references public.sermons(id) on delete cascade,
  book         text not null,
  chapter      int  not null,
  verse_start  int,
  verse_end    int,
  reference    text not null,
  created_at   timestamptz not null default now(),
  constraint sermon_scriptures_sermon_ref_key unique (sermon_id, reference)
);

create index if not exists sermon_scriptures_org_book_idx on public.sermon_scriptures (org_id, book);
create index if not exists sermon_scriptures_org_ref_idx  on public.sermon_scriptures (org_id, reference);

alter table public.sermon_scriptures enable row level security;

drop policy if exists sermon_scriptures_rw on public.sermon_scriptures;
create policy sermon_scriptures_rw on public.sermon_scriptures
  for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
