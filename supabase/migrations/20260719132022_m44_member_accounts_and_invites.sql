
-- m44 — Contas de membro: liga a ficha (stick) a um login (auth.users) via convite.
-- Fluxo: lideranca convida (members.manage) -> membro recebe token -> cria conta ->
-- chama accept_member_invite(token) -> vira membership com papel "Membro" + stick.user_id.

alter table public.sticks
  add column user_id uuid references auth.users(id) on delete set null;
create unique index sticks_user_unique on public.sticks(org_id, user_id) where user_id is not null;

create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  stick_id uuid not null references public.sticks(id) on delete cascade,
  email text not null,
  token text not null unique
    default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index member_invites_org_idx on public.member_invites(org_id, status);
create unique index member_invites_one_pending on public.member_invites(org_id, stick_id) where status = 'pending';

alter table public.member_invites enable row level security;

-- Gerir convites = quem gere membros (Dono/Pastor/Tesoureiro). O convidado NAO le esta
-- tabela: a aceitacao passa pela funcao SECURITY DEFINER abaixo (so precisa do token).
create policy member_invites_select on public.member_invites for select
  using (has_perm(org_id,'members.manage'));
create policy member_invites_insert on public.member_invites for insert
  with check (has_perm(org_id,'members.manage'));
create policy member_invites_update on public.member_invites for update
  using (has_perm(org_id,'members.manage')) with check (has_perm(org_id,'members.manage'));
create policy member_invites_delete on public.member_invites for delete
  using (has_perm(org_id,'members.manage'));

-- Aceitar convite. Chamada pelo usuario JA autenticado (acabou de criar a conta).
-- Idempotente-ish: se ja aceitou, o convite nao esta mais 'pending' e devolve erro claro.
create or replace function public.accept_member_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.member_invites%rowtype;
  v_role_id uuid;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_invite
    from public.member_invites
   where token = p_token
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then
    raise exception 'invite_invalid_or_expired' using errcode = '22023';
  end if;

  select id into v_role_id
    from public.roles
   where org_id = v_invite.org_id and name = 'Membro'
   limit 1;

  -- Liga a ficha ao login (se a ficha ja estiver ligada a outro user, o unique barra).
  update public.sticks
     set user_id = v_uid
   where id = v_invite.stick_id and org_id = v_invite.org_id;

  -- Associa a org com papel Membro (sem permissoes; owner=false).
  insert into public.memberships (org_id, user_id, role, role_id, permissions, is_owner)
  values (v_invite.org_id, v_uid, 'member', v_role_id, '{}', false)
  on conflict (org_id, user_id) do nothing;

  update public.member_invites
     set status = 'accepted', accepted_at = now(), accepted_by = v_uid
   where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

revoke execute on function public.accept_member_invite(text) from anon;
