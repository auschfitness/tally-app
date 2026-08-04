
-- m40 — Comunicacao estilo Basecamp, Fase 1: espacos + quadros de mensagem.
-- Participar (ler/postar) = qualquer membro logado da org (is_org_member).
-- Criar/gerir espaco = has_perm(org,'org.manage'). Autor edita/apaga o proprio post/comentario.
-- Contas de membro e chat ao vivo ficam para frentes seguintes. ref_id e polimorfico (sem FK).

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('group','ministry','church')),
  ref_id uuid,
  name text not null,
  description text,
  archived boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spaces_church_no_ref check (kind <> 'church' or ref_id is null),
  constraint spaces_scoped_ref check (kind = 'church' or ref_id is not null)
);
create unique index spaces_unique_scoped on public.spaces(org_id, kind, ref_id) where ref_id is not null;
create unique index spaces_unique_church on public.spaces(org_id) where kind = 'church';
create index spaces_org_idx on public.spaces(org_id);

create table public.space_posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index space_posts_space_idx on public.space_posts(space_id, created_at desc);
create index space_posts_org_idx on public.space_posts(org_id);

create table public.space_post_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null references public.space_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index space_post_comments_post_idx on public.space_post_comments(post_id, created_at);
create index space_post_comments_org_idx on public.space_post_comments(org_id);

alter table public.spaces enable row level security;
alter table public.space_posts enable row level security;
alter table public.space_post_comments enable row level security;

create policy spaces_select on public.spaces for select using (is_org_member(org_id));
create policy spaces_insert on public.spaces for insert with check (has_perm(org_id,'org.manage'));
create policy spaces_update on public.spaces for update using (has_perm(org_id,'org.manage')) with check (has_perm(org_id,'org.manage'));
create policy spaces_delete on public.spaces for delete using (has_perm(org_id,'org.manage'));

create policy space_posts_select on public.space_posts for select using (is_org_member(org_id));
create policy space_posts_insert on public.space_posts for insert with check (is_org_member(org_id) and author_id = (select auth.uid()));
create policy space_posts_update on public.space_posts for update using (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')) with check (author_id = (select auth.uid()) or has_perm(org_id,'org.manage'));
create policy space_posts_delete on public.space_posts for delete using (author_id = (select auth.uid()) or has_perm(org_id,'org.manage'));

create policy space_post_comments_select on public.space_post_comments for select using (is_org_member(org_id));
create policy space_post_comments_insert on public.space_post_comments for insert with check (is_org_member(org_id) and author_id = (select auth.uid()));
create policy space_post_comments_update on public.space_post_comments for update using (author_id = (select auth.uid()) or has_perm(org_id,'org.manage')) with check (author_id = (select auth.uid()) or has_perm(org_id,'org.manage'));
create policy space_post_comments_delete on public.space_post_comments for delete using (author_id = (select auth.uid()) or has_perm(org_id,'org.manage'));
