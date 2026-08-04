
-- m42 — Comunicacao estilo Basecamp, Fase 3: mensagens diretas 1:1.
-- Conversa entre dois usuarios que logam na mesma org. Par canonico (user_a < user_b) =
-- uma unica thread por dupla. RLS SO-PARTICIPANTE (mais rigorosa que is_org_member):
-- ninguem ve conversa alheia, nem o dono da org.

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dm_threads_ordered check (user_a < user_b)
);
create unique index dm_threads_unique_pair on public.dm_threads(org_id, user_a, user_b);
create index dm_threads_org_idx on public.dm_threads(org_id);
create index dm_threads_user_a_idx on public.dm_threads(user_a);
create index dm_threads_user_b_idx on public.dm_threads(user_b);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index dm_messages_thread_idx on public.dm_messages(thread_id, created_at);
create index dm_messages_org_idx on public.dm_messages(org_id);

-- Helper: o usuario logado participa desta thread? SECURITY DEFINER para evitar
-- RLS-dentro-de-RLS (mesmo padrao dos outros helpers do projeto).
create or replace function public.is_dm_participant(p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_threads t
    where t.id = p_thread
      and ((select auth.uid()) = t.user_a or (select auth.uid()) = t.user_b)
  );
$$;

-- Mantem last_message_at da thread em dia ao enviar (definer: participante nao precisa
-- de policy de update na thread).
create or replace function public.touch_dm_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_threads
     set last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end;
$$;

create trigger dm_messages_touch_thread
after insert on public.dm_messages
for each row execute function public.touch_dm_thread();

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

create policy dm_threads_select on public.dm_threads for select
  using (is_org_member(org_id) and ((select auth.uid()) = user_a or (select auth.uid()) = user_b));
create policy dm_threads_insert on public.dm_threads for insert
  with check (is_org_member(org_id) and ((select auth.uid()) = user_a or (select auth.uid()) = user_b));

create policy dm_messages_select on public.dm_messages for select
  using (is_dm_participant(thread_id));
create policy dm_messages_insert on public.dm_messages for insert
  with check (is_org_member(org_id) and sender_id = (select auth.uid()) and is_dm_participant(thread_id));
create policy dm_messages_update on public.dm_messages for update
  using (is_dm_participant(thread_id)) with check (is_dm_participant(thread_id));
create policy dm_messages_delete on public.dm_messages for delete
  using (sender_id = (select auth.uid()));
