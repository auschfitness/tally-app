-- m53: tela de leitura (spec 07). Dado de referência GLOBAL (sem org_id), leitura livre,
-- escrita só service_role — igual a bible_original_tokens (m34) e strong_frequency (m35).
--
-- bible_tagged_words: o texto português quebrado em trechos, cada um ligado (ou não) a um
-- número Strong. Concatenar `text` na ordem de `position` devolve o versículo exato.
-- `book` em OSIS ('John'), como bible_original_tokens.
create table if not exists public.bible_tagged_words (
  translation text not null,           -- 'por_blj' (Bíblia Livre)
  book        text not null,
  chapter     int  not null,
  verse       int  not null,
  position    int  not null,
  text        text not null,
  strong      text,                    -- 'G3056'; null = sem palavra original (espaço, pontuação, palavra de apoio)
  primary key (translation, book, chapter, verse, position)
);
alter table public.bible_tagged_words enable row level security;
drop policy if exists tagged_words_read on public.bible_tagged_words;
create policy tagged_words_read on public.bible_tagged_words for select using (true);

-- Glosa e definição curta em português (piloto João). Nulo = a tela usa o inglês.
alter table public.strongs_lexicon add column if not exists gloss_pt text;
alter table public.strongs_lexicon add column if not exists definition_pt text;

-- Ocorrências de um Strong agrupadas por livro/capítulo (aba "Ocorrências"). Agrega no
-- banco para não trazer milhares de linhas (G3588 tem ~20 mil).
create index if not exists bible_original_tokens_strong_idx on public.bible_original_tokens (strong);

create or replace function public.strong_occurrences(p_strong text)
returns table (book text, chapter int, n int)
language sql stable security invoker set search_path = public as $$
  select t.book, t.chapter, count(*)::int
  from public.bible_original_tokens t
  where t.strong = p_strong
  group by t.book, t.chapter
$$;
grant execute on function public.strong_occurrences(text) to anon, authenticated;

-- Reverter:
-- drop function if exists public.strong_occurrences(text);
-- drop index if exists public.bible_original_tokens_strong_idx;
-- alter table public.strongs_lexicon drop column if exists definition_pt, drop column if exists gloss_pt;
-- drop table if exists public.bible_tagged_words;
