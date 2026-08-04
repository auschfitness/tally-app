
create table groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  name text not null,
  description text,
  meeting_day text,
  meeting_time text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_groups_org on groups(org_id);
create index idx_groups_campus on groups(campus_id);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  stick_id uuid not null references sticks(id) on delete cascade,
  role group_member_role not null default 'member',
  joined_at date not null default current_date,
  left_at date,
  status text not null default 'active',
  unique (group_id, stick_id)
);
create index idx_gm_group on group_members(group_id);
create index idx_gm_stick on group_members(stick_id);

create table services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  name text not null,
  weekday int,
  start_time text,
  created_at timestamptz not null default now()
);
create index idx_services_org on services(org_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  name text not null,
  event_date date,
  starts_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_events_org on events(org_id);

create table attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  context_type attendance_context not null,
  context_id uuid,
  campus_id uuid references campuses(id) on delete set null,
  title text,
  session_date date not null,
  session_time text,
  photo text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_att_sessions_org on attendance_sessions(org_id);
create index idx_att_sessions_date on attendance_sessions(session_date);
create index idx_att_sessions_ctx on attendance_sessions(context_type, context_id);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  stick_id uuid not null references sticks(id) on delete cascade,
  status attendance_status not null default 'present',
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  source text not null default 'manual',
  unique (session_id, stick_id)
);
create index idx_att_records_session on attendance_records(session_id);
create index idx_att_records_stick on attendance_records(stick_id);
