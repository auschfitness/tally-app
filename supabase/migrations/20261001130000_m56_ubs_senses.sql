-- m56: dicionário UBS na aba Palavra (spec 09, frente A). Dado de referência GLOBAL (sem
-- org_id), leitura livre, escrita só service_role, igual a m53.
--
-- Um sentido do Dicionário Grego do NT da UBS (Louw-Nida revisado, CC BY-SA 4.0),
-- traduzido do espanhol pela Tally. Verbete com vários Strong vira uma linha por Strong.
-- `refs` = versículos onde a UBS diz que ESTE sentido é o usado, em OSIS ('Eph.4.5'); é o
-- que escolhe o sentido do versículo aberto.
create table if not exists public.ubs_senses (
  strong      text not null,           -- 'G0908', mesmo formato de bible_original_tokens
  sense_id    text not null,           -- LEXID da UBS
  lemma       text not null,
  entry_code  text,                    -- '53.41' (domínio.verbete do Louw-Nida)
  ord         int  not null,           -- ordem do sentido dentro do verbete
  glosses     text[] not null default '{}',
  definition  text,
  comments    text,                    -- parágrafos separados por linha em branco
  domains     text[] not null default '{}',
  subdomains  text[] not null default '{}',
  refs        text[] not null default '{}',
  primary key (strong, sense_id)
);
alter table public.ubs_senses enable row level security;
drop policy if exists ubs_senses_read on public.ubs_senses;
create policy ubs_senses_read on public.ubs_senses for select using (true);

-- Reverter:
-- drop table if exists public.ubs_senses;
