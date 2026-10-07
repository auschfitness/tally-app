-- m60: busca por palavra na Bíblia (sem IA). Índice de texto em português que ignora
-- acento ("graca" acha "graça") e entende variação de palavra ("graças" acha "graça").
-- A coluna é gerada a partir de `spans`, então recargas do sublinhado a mantêm em dia.
-- Custo: ~10-15 MB (texto + índice GIN) em bible_tagged_verses (31.102 versículos).

create extension if not exists unaccent with schema extensions;

do $$ begin
  if not exists (select 1 from pg_ts_config where cfgname = 'pt_busca') then
    create text search configuration public.pt_busca (copy = pg_catalog.portuguese);
    alter text search configuration public.pt_busca
      alter mapping for hword, hword_part, word with extensions.unaccent, pg_catalog.portuguese_stem;
  end if;
end $$;

-- Texto corrido do versículo a partir dos trechos [[texto, strong], ...].
create or replace function public.spans_text(s jsonb) returns text
language sql immutable parallel safe set search_path = ''
as $$ select coalesce(string_agg(e->>0, '' order by o), '') from jsonb_array_elements(s) with ordinality as t(e, o) $$;

alter table public.bible_tagged_verses
  add column if not exists search tsvector
  generated always as (to_tsvector('public.pt_busca'::regconfig, public.spans_text(spans))) stored;

create index if not exists bible_tagged_verses_search on public.bible_tagged_verses using gin (search);

-- Busca: versículos na ordem da Bíblia (Gênesis -> Apocalipse), com o total para paginar.
-- p_books = livros OSIS (null = Bíblia toda). Devolve os trechos; o app limpa e destaca.
create or replace function public.search_bible(q text, p_books text[] default null, lim int default 50, off int default 0)
returns table (book text, chapter int, verse int, spans jsonb, total bigint)
language sql stable set search_path = ''
as $$
  with tq as (select websearch_to_tsquery('public.pt_busca'::regconfig, coalesce(q, '')) as t),
  ord as (
    select array[
      'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh',
      'Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic',
      'Nah','Hab','Zeph','Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil',
      'Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'
    ]::text[] as books
  )
  select v.book, v.chapter, v.verse, v.spans, count(*) over () as total
  from public.bible_tagged_verses v, tq, ord
  where v.translation = 'por_blj'
    and numnode(tq.t) > 0
    and v.search @@ tq.t
    and (p_books is null or v.book = any (p_books))
  order by array_position(ord.books, v.book), v.chapter, v.verse
  limit least(greatest(lim, 1), 100) offset greatest(off, 0)
$$;

grant execute on function public.search_bible(text, text[], int, int) to anon, authenticated;
