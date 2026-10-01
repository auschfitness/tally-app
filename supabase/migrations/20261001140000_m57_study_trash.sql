-- m57: lixeira de 30 dias para sermões, notas e notas do texto.
-- Excluir = marcar deleted_at; as listas escondem o que tem deleted_at; a página
-- Lixeira restaura (deleted_at = null) e apaga de vez o que passou de 30 dias.
alter table public.sermons add column if not exists deleted_at timestamptz;
alter table public.study_notes add column if not exists deleted_at timestamptz;
alter table public.study_text_notes add column if not exists deleted_at timestamptz;

create index if not exists sermons_deleted_idx on public.sermons (org_id, deleted_at) where deleted_at is not null;
create index if not exists study_notes_deleted_idx on public.study_notes (org_id, deleted_at) where deleted_at is not null;
create index if not exists study_text_notes_deleted_idx on public.study_text_notes (org_id, deleted_at) where deleted_at is not null;
