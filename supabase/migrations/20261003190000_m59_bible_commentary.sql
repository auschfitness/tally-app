-- m59: comentários bíblicos (Frente C, spec 09)
-- Tabela global de leitura pública por RLS (como m53, m56, m58).
create table if not exists public.bible_commentary (
  id text primary key,
  source text not null,       -- 'jfb' ou 'tyndale'
  book text not null,         -- OSIS ('John')
  chapter int not null,
  verse_start int not null,
  verse_end int not null,
  kind text not null default 'verse', -- 'intro' ou 'verse'
  text_pt text not null,
  text_en text not null
);

alter table public.bible_commentary enable row level security;

create policy bible_commentary_read on public.bible_commentary
  for select using (true);

create index if not exists idx_bible_commentary_book_chap
  on public.bible_commentary (book, chapter);
