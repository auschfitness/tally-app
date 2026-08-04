-- Comunicação Fase 1: e-mail (a membros/Sticks) + registro no app, AGNÓSTICO de provedor.
-- Destinatários resolvidos de grupos/Signals/Care/todos/manual no momento do envio, respeitando
-- os consentimentos do Stick (email_allowed etc.). Entrega real de e-mail = passo posterior
-- (edge function + chave de provedor), fora deste schema. Capability nova: communication.send.

-- 1) Templates reutilizáveis (por org)
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'email' check (channel in ('email','in_app')),
  subject text,
  body text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Mensagem (um envio/campanha)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','in_app')),
  subject text,
  body text not null,
  audience_kind text not null check (audience_kind in ('all','group','signal','care','manual')),
  audience_ref jsonb not null default '{}'::jsonb,     -- ex.: {"group_id": "..."} / {"signal_type":"..."} / {"stick_ids":[...]}
  status text not null default 'draft' check (status in ('draft','queued','sending','sent','failed')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists messages_by_org on public.messages (org_id, created_at desc);

-- 3) Destinatário por mensagem (log de entrega; snapshot de contato no envio)
create table if not exists public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  stick_id uuid references public.sticks(id) on delete set null,
  to_name text,
  to_email text,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  error text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists message_recipients_by_message on public.message_recipients (message_id);

-- RLS: as três gated por communication.send (ferramenta interna; lista traz PII/consentimento).
alter table public.message_templates enable row level security;
alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;

drop policy if exists message_templates_rw on public.message_templates;
create policy message_templates_rw on public.message_templates
  for all using (public.has_perm(org_id,'communication.send')) with check (public.has_perm(org_id,'communication.send'));
drop policy if exists messages_rw on public.messages;
create policy messages_rw on public.messages
  for all using (public.has_perm(org_id,'communication.send')) with check (public.has_perm(org_id,'communication.send'));
drop policy if exists message_recipients_rw on public.message_recipients;
create policy message_recipients_rw on public.message_recipients
  for all using (public.has_perm(org_id,'communication.send')) with check (public.has_perm(org_id,'communication.send'));

-- 4) Capability communication.send: seed p/ novos orgs (Pastor) + corrige finance.manage ausente no seed.
create or replace function public.seed_default_system_roles(p_org uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Sem permissão para semear papéis nesta organização.';
  end if;
  if exists (select 1 from public.roles r where r.org_id = p_org and r.is_system) then
    return;
  end if;
  insert into public.roles(org_id, name, permissions, is_system) values
    (p_org, 'Dono', array[]::text[], true),
    (p_org, 'Pastor', array['sticks.edit','care.view','care.manage','prayer.view_private','prayer.manage','groups.manage_all','org.manage','members.manage','finance.manage','communication.send'], true),
    (p_org, 'Tesoureiro', array['finance.manage','members.manage'], true),
    (p_org, 'Equipe de Cuidado', array['sticks.edit','care.view'], true),
    (p_org, 'Líder de Grupo', array['groups.manage_assigned'], true),
    (p_org, 'Membro', array[]::text[], true);
end $function$;

-- 5) Backfill: Pastor das orgs existentes ganha communication.send (idempotente).
update public.roles
set permissions = permissions || array['communication.send']
where name = 'Pastor' and is_system
  and not (permissions @> array['communication.send']);
