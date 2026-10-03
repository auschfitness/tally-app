-- m58: uma linha por versículo (em vez de uma por trecho) para economizar espaço.
-- bible_tagged_words continua existindo até o app novo estar no ar e conferido.
create table if not exists public.bible_tagged_verses (
  translation text not null, book text not null, chapter int not null, verse int not null,
  spans jsonb not null,  -- [["No princípio","G0746"],[" ",null],...] na ordem
  primary key (translation, book, chapter, verse)
);

alter table public.bible_tagged_verses enable row level security;
create policy tagged_verses_read on public.bible_tagged_verses for select using (true);

insert into public.bible_tagged_verses (translation, book, chapter, verse, spans)
select translation, book, chapter, verse, jsonb_agg(jsonb_build_array(text, strong) order by position)
from public.bible_tagged_words group by translation, book, chapter, verse
on conflict do nothing;
