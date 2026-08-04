-- Estudo Bíblico / aba Referências: referências cruzadas (Treasury of Scripture Knowledge via
-- openbible.info, CC BY). DADO DE REFERÊNCIA GLOBAL (não por org) — compartilhado por todas as
-- igrejas, somente leitura para o cliente; a carga (~340k linhas) roda com service_role (loader).
create table if not exists public.cross_references (
  id bigint generated always as identity primary key,
  from_book text not null,        -- código OSIS do livro de origem (ex.: 'John')
  from_chapter int not null,
  from_verse int not null,
  to_book text not null,          -- código OSIS do livro de destino
  to_chapter int not null,
  to_verse_start int not null,
  to_verse_end int,               -- null quando é um único versículo
  votes int not null default 0    -- relevância (ranking); ordenar desc
);
create index if not exists cross_references_from_idx
  on public.cross_references (from_book, from_chapter, from_verse);

alter table public.cross_references enable row level security;
-- Leitura livre (dado público de referência, não sensível). Sem policy de escrita:
-- só o service_role (loader) grava; anon/authenticated não conseguem inserir/alterar.
create policy cross_references_read on public.cross_references
  for select using (true);
