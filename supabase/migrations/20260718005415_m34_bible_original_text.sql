-- Estudo Bíblico / Fase 2 — texto original (interlinear). Fonte: STEPBible-Data (TAGNT grego +
-- TAHOT hebraico), CC BY 4.0. DADO DE REFERÊNCIA GLOBAL (sem org_id); leitura livre; escrita só
-- via service_role (loader). Alimenta a aba "Original": tocar palavra → Strong/lema/significado/morfo.

-- Um registro por PALAVRA do texto original.
create table if not exists public.bible_original_tokens (
  id bigint generated always as identity primary key,
  lang text not null check (lang in ('grc','hbo')),  -- grego / hebraico
  book text not null,        -- código do livro (alinhar com os códigos da UI/helloao)
  chapter int not null,
  verse int not null,
  position int not null,     -- ordem da palavra no versículo
  surface text not null,     -- forma no texto (ex.: ἠγάπησεν)
  lemma text,                -- forma de dicionário (ex.: ἀγαπάω)
  strong text,               -- número de Strong (ex.: 'G25' / 'H430')
  morph text,                -- código morfológico (ex.: 'V-AAI-3S')
  gloss text,                -- glosa curta (inglês, do STEPBible; PT/ES depois)
  translit text
);
create index if not exists tokens_ref_idx
  on public.bible_original_tokens (book, chapter, verse, position);
create index if not exists tokens_strong_idx
  on public.bible_original_tokens (strong);
alter table public.bible_original_tokens enable row level security;
create policy tokens_read on public.bible_original_tokens for select using (true);

-- Léxico de Strong (definições) — Strong's dictionary (domínio público) / STEPBible.
create table if not exists public.strongs_lexicon (
  strong text primary key,   -- 'G25', 'H430'
  lang text not null check (lang in ('grc','hbo')),
  lemma text,
  translit text,
  pronunciation text,
  gloss text,                -- significado curto
  definition text            -- definição mais completa
);
alter table public.strongs_lexicon enable row level security;
create policy strongs_read on public.strongs_lexicon for select using (true);
