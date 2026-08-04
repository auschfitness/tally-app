
create table signals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  type text not null,
  category text not null,
  title text not null,
  description text,
  source_module text,
  source_record_id uuid,
  related_stick_id uuid references sticks(id) on delete cascade,
  related_group_id uuid references groups(id) on delete set null,
  priority signal_priority not null default 'notice',
  status signal_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  dismissed_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_signals_org on signals(org_id);
create index idx_signals_stick on signals(related_stick_id);
create index idx_signals_status on signals(status);
create index idx_signals_category on signals(category);

create table care_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stick_id uuid references sticks(id) on delete cascade,
  signal_id uuid references signals(id) on delete set null,
  category text,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  priority signal_priority not null default 'attention',
  status care_status not null default 'new',
  due_date date,
  confidentiality_level text not null default 'care_team',
  next_action text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index idx_care_org on care_items(org_id);
create index idx_care_stick on care_items(stick_id);
create index idx_care_status on care_items(status);

create table care_notes (
  id uuid primary key default gen_random_uuid(),
  care_item_id uuid not null references care_items(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  visibility text not null default 'care_team',
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_care_notes_item on care_notes(care_item_id);

create table care_contacts (
  id uuid primary key default gen_random_uuid(),
  care_item_id uuid not null references care_items(id) on delete cascade,
  stick_id uuid references sticks(id) on delete set null,
  contacted_by uuid references auth.users(id) on delete set null,
  contacted_on date not null default current_date,
  method text,
  note text,
  created_at timestamptz not null default now()
);
create index idx_care_contacts_item on care_contacts(care_item_id);

create table timeline_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stick_id uuid not null references sticks(id) on delete cascade,
  event_type text not null,
  source_module text,
  source_record_id uuid,
  title text not null,
  summary text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  visibility text not null default 'church',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_timeline_stick on timeline_events(stick_id);
create index idx_timeline_org on timeline_events(org_id);
create index idx_timeline_occurred on timeline_events(occurred_at);
