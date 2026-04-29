-- DevNest Admin Portal — initial schema
-- Run this in Supabase SQL editor (Database → SQL Editor → New query → paste → Run)

-- =============================================================================
-- Tables
-- =============================================================================

-- profiles: 1:1 with auth.users, holds role + display fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('admin', 'employee')) default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- time_events: append-only log of clock-in/out + breaks
create table public.time_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('login', 'break_start', 'break_end', 'logout')),
  occurred_at timestamptz not null default now()
);
create index time_events_employee_day_idx on public.time_events (employee_id, occurred_at);

-- job_applications: matches the tracking sheet + follow_up_date
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  applied_date date not null default current_date,
  platform text,
  country text,
  city text,
  company text,
  job_nature text,
  company_link text,
  job_title text,
  job_link text,
  client_name text,
  position text,
  contact_email text,
  status text not null default 'applied'
    check (status in ('applied', 'interview_scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'no_response')),
  interview_date date,
  interview_time time,
  feedback text,
  comments text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_applications_employee_idx on public.job_applications (employee_id);
create index job_applications_followup_idx on public.job_applications (follow_up_date) where follow_up_date is not null;

-- updated_at trigger for job_applications
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger job_applications_set_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Auto-create a profile when a user signs up
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.time_events enable row level security;
alter table public.job_applications enable row level security;

-- is_admin() helper (security definer to bypass RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles policies
create policy profiles_self_or_admin_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_admin_insert on public.profiles
  for insert with check (public.is_admin());

create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- time_events policies
create policy time_events_self_all on public.time_events
  for all using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy time_events_admin_read on public.time_events
  for select using (public.is_admin());

-- job_applications policies
create policy jobs_self_all on public.job_applications
  for all using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy jobs_admin_read on public.job_applications
  for select using (public.is_admin());
