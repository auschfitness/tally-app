
create table prayer_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  stick_id uuid references sticks(id) on delete set null,
  author_name text,
  request text not null,
  topics text[] not null default '{}',
  privacy prayer_privacy not null default 'church',
  group_id uuid references groups(id) on delete set null,
  praying_count int not null default 0,
  answered boolean not null default false,
  answered_on date,
  created_at timestamptz not null default now()
);
create index idx_prayer_org on prayer_requests(org_id);
create index idx_prayer_stick on prayer_requests(stick_id);
create index idx_prayer_answered on prayer_requests(answered);

create table funds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index idx_funds_org on funds(org_id);

create table finance_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  type entry_type not null,
  name text not null,
  created_at timestamptz not null default now()
);
create index idx_fincat_org on finance_categories(org_id);

create table finance_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campus_id uuid references campuses(id) on delete set null,
  type entry_type not null,
  description text not null,
  category_id uuid references finance_categories(id) on delete set null,
  category_name text,
  fund_id uuid references funds(id) on delete set null,
  fund_name text,
  amount numeric(14,2) not null default 0,
  entry_date date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_finentry_org on finance_entries(org_id);
create index idx_finentry_date on finance_entries(entry_date);
create index idx_finentry_type on finance_entries(type);
