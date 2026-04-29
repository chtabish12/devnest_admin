-- Standup attendance — three slots per day, GMT times: 09:30, 12:00, 16:00.

create table public.standup_attendances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  standup_date date not null default current_date,
  slot text not null check (slot in ('morning', 'midday', 'afternoon')),
  attended_at timestamptz not null default now(),
  notes text,
  unique (employee_id, standup_date, slot)
);
create index standup_attendances_date_idx on public.standup_attendances (standup_date);

alter table public.standup_attendances enable row level security;

create policy standups_self_all on public.standup_attendances
  for all using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy standups_admin_read on public.standup_attendances
  for select using (public.is_admin());
