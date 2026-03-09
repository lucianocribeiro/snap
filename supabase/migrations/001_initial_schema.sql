create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('super_admin', 'org_admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'language_code') then
    create type language_code as enum ('en', 'es');
  end if;

  if not exists (select 1 from pg_type where typname = 'record_status') then
    create type record_status as enum ('active', 'inactive');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type project_status as enum ('active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'category_request_status') then
    create type category_request_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('paid', 'unpaid');
  end if;
end$$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text not null unique,
  organization_id uuid references organizations(id) on delete set null,
  role user_role not null default 'user',
  language language_code not null default 'en',
  status record_status not null default 'active',
  last_login_at timestamptz
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  period_type text not null,
  selected_columns jsonb not null default '[]'::jsonb,
  custom_column_labels jsonb not null default '{}'::jsonb,
  status project_status not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references user_profiles(id) on delete set null
);

create table if not exists project_periods (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_by uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists category_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  category_name text not null,
  requested_by uuid references user_profiles(id) on delete set null,
  status category_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_number text,
  vendor text,
  invoice_date date,
  due_date date,
  amount numeric(14, 2) default 0,
  tax numeric(14, 2) default 0,
  total_amount numeric(14, 2) default 0,
  category_id uuid references categories(id) on delete set null,
  status invoice_status not null default 'unpaid',
  notes text,
  custom1 text,
  custom2 text,
  custom3 text,
  original_file_url text,
  column_mappings jsonb not null default '{}'::jsonb,
  uploaded_by uuid references user_profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  last_edited_at timestamptz not null default now()
);

create table if not exists vendor_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vendor_name text not null,
  column_mappings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (organization_id, vendor_name)
);

create index if not exists idx_user_profiles_org on user_profiles (organization_id);
create index if not exists idx_projects_org on projects (organization_id);
create index if not exists idx_project_periods_project on project_periods (project_id);
create index if not exists idx_categories_org on categories (organization_id);
create index if not exists idx_category_requests_org on category_requests (organization_id);
create index if not exists idx_invoices_org on invoices (organization_id);
create index if not exists idx_vendor_mappings_org on vendor_mappings (organization_id);

alter table projects enable row level security;
alter table categories enable row level security;
alter table category_requests enable row level security;
alter table invoices enable row level security;
alter table vendor_mappings enable row level security;
alter table project_periods enable row level security;

drop policy if exists org_isolation on projects;
create policy org_isolation on projects
  for all
  using (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  );

drop policy if exists org_isolation on categories;
create policy org_isolation on categories
  for all
  using (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  );

drop policy if exists org_isolation on category_requests;
create policy org_isolation on category_requests
  for all
  using (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  );

drop policy if exists org_isolation on invoices;
create policy org_isolation on invoices
  for all
  using (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  );

drop policy if exists org_isolation on vendor_mappings;
create policy org_isolation on vendor_mappings
  for all
  using (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  );

drop policy if exists org_isolation on project_periods;
create policy org_isolation on project_periods
  for all
  using (
    exists (
      select 1
      from projects
      where projects.id = project_periods.project_id
      and projects.organization_id = (
        select organization_id from user_profiles
        where id = auth.uid()
      )
    )
  )
  with check (
    exists (
      select 1
      from projects
      where projects.id = project_periods.project_id
      and projects.organization_id = (
        select organization_id from user_profiles
        where id = auth.uid()
      )
    )
  );
