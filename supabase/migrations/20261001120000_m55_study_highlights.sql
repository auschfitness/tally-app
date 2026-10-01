-- Spec 08 (parte 2 do pivô Raízes): destaque colorido por versículo na tela de leitura.
-- PRIVADO POR AUTOR, igual a study_text_notes (m37). Um destaque por versículo por pessoa.
-- Reverter: drop table public.study_highlights;
create table if not exists public.study_highlights (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book        text not null,               -- código OSIS, igual às demais tabelas bíblicas
  chapter     integer not null,
  verse       integer not null,
  color       text not null check (color in ('yellow', 'green', 'blue', 'pink', 'orange')),
  updated_at  timestamptz not null default now(),
  unique (author_id, org_id, book, chapter, verse)
);

alter table public.study_highlights enable row level security;

drop policy if exists study_highlights_select on public.study_highlights;
create policy study_highlights_select on public.study_highlights
  for select using (author_id = auth.uid());

drop policy if exists study_highlights_insert on public.study_highlights;
create policy study_highlights_insert on public.study_highlights
  for insert with check (author_id = auth.uid() and public.is_org_member(org_id));

drop policy if exists study_highlights_update on public.study_highlights;
create policy study_highlights_update on public.study_highlights
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists study_highlights_delete on public.study_highlights;
create policy study_highlights_delete on public.study_highlights
  for delete using (author_id = auth.uid());
