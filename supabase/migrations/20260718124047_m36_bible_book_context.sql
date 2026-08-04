-- Fase 3 (Contexto): cartão editorial por livro, na voz do Tally. Dado de referência GLOBAL
-- (sem org_id; leitura livre; escrita só service_role/owner). Conteúdo semeado pelo orquestrador.
create table if not exists public.bible_book_context (
  book        text primary key,          -- código OSIS, igual às demais tabelas bíblicas
  testament   text not null,             -- 'AT' | 'NT'
  title_pt    text not null,
  author      text,
  date_range  text,
  audience    text,
  theme       text,
  summary     text,
  updated_at  timestamptz not null default now()
);

alter table public.bible_book_context enable row level security;

drop policy if exists bible_book_context_read on public.bible_book_context;
create policy bible_book_context_read on public.bible_book_context
  for select using (true);
