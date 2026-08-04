
create table app_state (
  org_id uuid primary key references organizations(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table app_state enable row level security;
create policy org_all on app_state for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
