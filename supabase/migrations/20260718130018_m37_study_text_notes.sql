-- Fase 3 (Notas): anotações de estudo do pastor, ancoradas a livro/capítulo/versículo.
-- Dado OPERACIONAL (por org). Privacidade: PRIVADA POR AUTOR (padrão seguro p/ dado de usuário).
-- Para abrir p/ a equipe de ensino no futuro, trocar o USING do SELECT por is_org_member(org_id).
create table if not exists public.study_text_notes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book        text not null,               -- código OSIS, igual às demais tabelas bíblicas
  chapter     integer,
  verse_start integer,
  verse_end   integer,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists study_text_notes_lookup
  on public.study_text_notes (author_id, org_id, book, chapter);

alter table public.study_text_notes enable row level security;

drop policy if exists study_text_notes_select on public.study_text_notes;
create policy study_text_notes_select on public.study_text_notes
  for select using (author_id = auth.uid());

drop policy if exists study_text_notes_insert on public.study_text_notes;
create policy study_text_notes_insert on public.study_text_notes
  for insert with check (author_id = auth.uid() and public.is_org_member(org_id));

drop policy if exists study_text_notes_update on public.study_text_notes;
create policy study_text_notes_update on public.study_text_notes
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists study_text_notes_delete on public.study_text_notes;
create policy study_text_notes_delete on public.study_text_notes
  for delete using (author_id = auth.uid());
