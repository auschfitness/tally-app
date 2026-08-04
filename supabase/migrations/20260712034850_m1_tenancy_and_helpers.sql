
create extension if not exists pgcrypto;

create type relationship_status as enum ('visitor_first','visitor_returning','attendee','member','inactive');
create type attendance_status as enum ('present','absent','excused','unknown');
create type attendance_context as enum ('service','group','event','teaching');
create type signal_priority as enum ('celebration','notice','attention','urgent');
create type signal_status as enum ('new','seen','assigned','in_progress','resolved','dismissed');
create type care_status as enum ('new','assigned','in_progress','waiting','resolved','closed');
create type prayer_privacy as enum ('church','group','leader','private');
create type entry_type as enum ('in','out');
create type group_member_role as enum ('member','leader','co_leader','host');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'BRL',
  created_at timestamptz not null default now()
);

create table campuses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index idx_campuses_org on campuses(org_id);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_roles_org on roles(org_id);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  role_id uuid references roles(id) on delete set null,
  permissions text[] not null default '{}',
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index idx_memberships_user on memberships(user_id);
create index idx_memberships_org on memberships(org_id);

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from memberships m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.has_perm(p_org uuid, p_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
      and (m.is_owner
        or p_perm = any(m.permissions)
        or exists(select 1 from roles r where r.id = m.role_id and p_perm = any(r.permissions)))
  );
$$;
