-- Fase 3 (Palavras-chave): frequência global de cada Strong, derivada de bible_original_tokens.
-- Dado de referência GLOBAL (sem org_id; leitura livre; escrita só service_role/owner). Estático:
-- recomputar só se os tokens forem recarregados. Torna "esta palavra aparece N vezes" instantâneo.
create table if not exists public.strong_frequency (
  strong      text primary key,
  lang        text not null,
  occurrences integer not null
);

insert into public.strong_frequency (strong, lang, occurrences)
select strong, min(lang), count(*)::int
from public.bible_original_tokens
where strong is not null and strong <> ''
group by strong
on conflict (strong) do update
  set lang = excluded.lang, occurrences = excluded.occurrences;

alter table public.strong_frequency enable row level security;

drop policy if exists strong_frequency_read on public.strong_frequency;
create policy strong_frequency_read on public.strong_frequency
  for select using (true);
