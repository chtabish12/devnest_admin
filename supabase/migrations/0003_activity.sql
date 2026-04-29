-- Browser activity tracking — populated by the DevNest Chrome extension.
-- Each row is one focused-tab session: the user kept tab X focused from
-- started_at until ended_at. The extension sends batches of sessions every
-- ~30s, marking idle periods (no keyboard/mouse activity) so we can exclude
-- them from "productive time" calculations.

create table public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  hostname text not null,
  url text,
  title text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  was_idle boolean not null default false,
  category text check (category in ('productive', 'neutral', 'distracting')),
  created_at timestamptz not null default now()
);
create index activity_sessions_employee_day_idx
  on public.activity_sessions (employee_id, started_at);
create index activity_sessions_hostname_idx
  on public.activity_sessions (hostname);

alter table public.activity_sessions enable row level security;

-- Employee can read/insert their own activity. (No update/delete by design — append-only audit log.)
create policy activity_self_read on public.activity_sessions
  for select using (employee_id = auth.uid());
create policy activity_self_insert on public.activity_sessions
  for insert with check (employee_id = auth.uid());

-- Admin reads everyone's.
create policy activity_admin_read on public.activity_sessions
  for select using (public.is_admin());
