
-- m45 — Chat ao vivo (estilo Campfire): uma sala continua por espaco.
-- Visibilidade herda do espaco via can_see_space (respeita leaders/members do m43).
-- Realtime ligado para o front assinar as mensagens novas.

create table public.space_chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index space_chat_space_idx on public.space_chat_messages(space_id, created_at desc);
create index space_chat_org_idx on public.space_chat_messages(org_id);

alter table public.space_chat_messages enable row level security;

create policy space_chat_select on public.space_chat_messages for select
  using (can_see_space(space_id));
create policy space_chat_insert on public.space_chat_messages for insert
  with check (can_see_space(space_id) and sender_id = (select auth.uid()));
create policy space_chat_delete on public.space_chat_messages for delete
  using (can_see_space(space_id) and (sender_id = (select auth.uid()) or has_perm(org_id,'org.manage')));

-- Realtime: o front assina INSERTs desta tabela. O RLS continua valendo no canal.
alter publication supabase_realtime add table public.space_chat_messages;
