
create table journey_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_journey_stages_org on journey_stages(org_id);

create table sticks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  primary_campus_id uuid references campuses(id) on delete set null,
  full_name text not null,
  preferred_name text,
  first_name text,
  last_name text,
  profile_photo text,
  birth_date date,
  gender text,
  primary_language text default 'pt',
  email text,
  phone text,
  whatsapp text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text,
  relationship_status relationship_status not null default 'visitor_first',
  is_leader boolean not null default false,
  first_visit_date date,
  membership_date date,
  conversion_date date,
  baptism_date date,
  assigned_pastor_id uuid references sticks(id) on delete set null,
  assigned_care_leader_id uuid references sticks(id) on delete set null,
  journey_stage_id uuid references journey_stages(id) on delete set null,
  source text,
  source_detail text,
  tags text[] not null default '{}',
  preferred_contact_method text,
  email_allowed boolean not null default true,
  sms_allowed boolean not null default true,
  whatsapp_allowed boolean not null default true,
  last_seen_at date,
  followup_open boolean not null default false,
  archived boolean not null default false,
  archive_reason text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sticks_org on sticks(org_id);
create index idx_sticks_campus on sticks(primary_campus_id);
create index idx_sticks_journey on sticks(journey_stage_id);
create index idx_sticks_rel on sticks(relationship_status);

create table households (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  campus_id uuid references campuses(id) on delete set null,
  address text,
  photo text,
  created_at timestamptz not null default now()
);
create index idx_households_org on households(org_id);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  stick_id uuid not null references sticks(id) on delete cascade,
  relationship_type text not null default 'adult',
  is_primary_contact boolean not null default false,
  unique (household_id, stick_id)
);
create index idx_hhm_household on household_members(household_id);
create index idx_hhm_stick on household_members(stick_id);

create table milestone_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  is_system boolean not null default false,
  auto boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_milestone_types_org on milestone_types(org_id);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stick_id uuid not null references sticks(id) on delete cascade,
  milestone_type_id uuid references milestone_types(id) on delete set null,
  code text,
  occurred_on date not null,
  title text,
  description text,
  source_module text,
  source_record_id uuid,
  visibility text not null default 'church',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_milestones_stick on milestones(stick_id);
create index idx_milestones_org on milestones(org_id);
