-- Employee leaves. Each employee can take up to 2 leaves per calendar month.
-- The cap is enforced both client-side (button disabled) and server-side
-- (a per-row trigger before insert).

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  leave_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (employee_id, leave_date)
);
create index leaves_employee_date_idx on public.leaves (employee_id, leave_date);

-- Enforce monthly cap at the DB level.
create or replace function public.enforce_monthly_leave_cap()
returns trigger language plpgsql as $$
declare
  count_in_month integer;
begin
  select count(*) into count_in_month
  from public.leaves
  where employee_id = new.employee_id
    and date_trunc('month', leave_date) = date_trunc('month', new.leave_date::timestamp);
  if count_in_month >= 2 then
    raise exception 'Monthly leave limit reached (2 per calendar month)';
  end if;
  return new;
end;
$$;

create trigger leaves_enforce_monthly_cap
  before insert on public.leaves
  for each row execute function public.enforce_monthly_leave_cap();

alter table public.leaves enable row level security;

-- Employee can manage own leaves; admin reads all.
create policy leaves_self_all on public.leaves
  for all using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy leaves_admin_read on public.leaves
  for select using (public.is_admin());
