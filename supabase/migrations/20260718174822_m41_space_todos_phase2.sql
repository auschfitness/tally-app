
-- m41 — Comunicacao estilo Basecamp, Fase 2: to-dos por espaco.
-- Listas de tarefas + itens atribuiveis (responsavel, prazo, concluir). Colaborativo:
-- qualquer membro logado da org marca/edita um todo; apagar todo/lista = criador ou org.manage.
-- assignee_id/created_by/done_by = auth.users (por ora, quem loga; extensivel a sticks depois).

create table public.space_todo_lists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index space_todo_lists_space_idx on public.space_todo_lists(space_id, created_at);
create index space_todo_lists_org_idx on public.space_todo_lists(org_id);

create table public.space_todos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  list_id uuid not null references public.space_todo_lists(id) on delete cascade,
  title text not null,
  notes text,
  assignee_id uuid references auth.users(id),
  due_on date,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references auth.users(id),
  position integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index space_todos_list_idx on public.space_todos(list_id, position, created_at);
create index space_todos_space_idx on public.space_todos(space_id);
create index space_todos_org_idx on public.space_todos(org_id);
create index space_todos_assignee_idx on public.space_todos(assignee_id) where assignee_id is not null;

alter table public.space_todo_lists enable row level security;
alter table public.space_todos enable row level security;

create policy space_todo_lists_select on public.space_todo_lists for select using (is_org_member(org_id));
create policy space_todo_lists_insert on public.space_todo_lists for insert with check (is_org_member(org_id) and created_by = (select auth.uid()));
create policy space_todo_lists_update on public.space_todo_lists for update using (created_by = (select auth.uid()) or has_perm(org_id,'org.manage')) with check (created_by = (select auth.uid()) or has_perm(org_id,'org.manage'));
create policy space_todo_lists_delete on public.space_todo_lists for delete using (created_by = (select auth.uid()) or has_perm(org_id,'org.manage'));

create policy space_todos_select on public.space_todos for select using (is_org_member(org_id));
create policy space_todos_insert on public.space_todos for insert with check (is_org_member(org_id) and created_by = (select auth.uid()));
create policy space_todos_update on public.space_todos for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy space_todos_delete on public.space_todos for delete using (created_by = (select auth.uid()) or has_perm(org_id,'org.manage'));
