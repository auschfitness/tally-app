-- Onda 1 / A2: cada campus é entidade separada — dados operacionais.
alter table public.campuses
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists address jsonb not null default '{}'::jsonb,
  add column if not exists active boolean not null default true;
-- Financeiro por campus continua via finance_entries.campus_id (sem coluna nova).
