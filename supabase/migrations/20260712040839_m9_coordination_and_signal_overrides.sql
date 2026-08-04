
create table coordination_posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  title text not null,
  body text,
  team text,
  posted_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_coordposts_org on coordination_posts(org_id);

create table coordination_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  text text not null,
  assignee text,
  done boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_coordtasks_org on coordination_tasks(org_id);

create table signal_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  signal_key text not null,
  status text not null,
  updated_at timestamptz not null default now(),
  unique (org_id, signal_key)
);
create index idx_sigoverrides_org on signal_overrides(org_id);

alter table coordination_posts enable row level security;
alter table coordination_tasks enable row level security;
alter table signal_overrides enable row level security;

create policy org_all on coordination_posts for all to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy org_all on coordination_tasks for all to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy org_all on signal_overrides for all to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
