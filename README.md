# DevNest Admin Portal

Internal portal for DevNest. Admins add employees; employees clock in/out, take breaks,
log job applications they're working on, mark daily standup attendance, and end the day
with an automatic report.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + Row-Level Security)
- React Hook Form + Zod for forms

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

- Go to https://supabase.com → New project → free tier is enough.
- Once provisioned, open **Project Settings → API** and copy:
  - `Project URL`
  - `anon public` key
  - `service_role` key (keep this server-only)

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill `.env.local` with the three values above.

### 4. Run the migrations

In Supabase, go to **SQL Editor → New query** and run the files in order:

1. `supabase/migrations/0001_init.sql` — profiles, time_events, job_applications, RLS
2. `supabase/migrations/0002_standups.sql` — standup attendance

### 5. Bootstrap the first admin

There is no "first admin" seeding — you create one yourself:

1. Run the dev server: `npm run dev`.
2. Open http://localhost:3000/login → click **Sign up** → create the admin account.
3. In Supabase **SQL Editor**, promote that account to admin:

   ```sql
   update profiles set role = 'admin' where email = 'YOU@example.com';
   ```

4. Sign out and sign back in. You'll land on `/admin`.

After this point, **all other employees are created from `/admin/employees/new`** — never via the public signup form.

## Daily flow

### Employee
- Sign in → land on `/dashboard`.
- **Login (start day)** → timer starts.
- **Take break** / **End break** as needed.
- **Mark standup** at each of the three slots (9:30, 12:00, 16:00 GMT — local time shown in the card).
- **Log a job application** any time → fills the 17 sheet columns + a follow-up date.
- Follow-ups due today appear on the dashboard home.
- **End of day** → inserts logout event, redirects to today's report.

### Admin
- `/admin` — overview cards.
- `/admin/employees` — list + add new employee (requires temp password).
- `/admin/employees/[id]?date=YYYY-MM-DD` — daily report for a specific employee on a specific day.
- `/admin/reports?date=YYYY-MM-DD` — cross-employee summary for any day.

## Scripts

```bash
npm run dev        # local dev at :3000
npm run build      # production build
npm run start      # production server
npm run lint       # next lint
npm run typecheck  # strict TS check
```

## Project layout

```
app/
  (admin)/admin/...       admin-only routes (role-guarded)
  (employee)/dashboard/   employee routes (role-guarded)
  login/                  shared sign-in
  auth/signout/           POST signout
components/               shared UI (TimeTrackerCard, JobApplicationForm, …)
lib/
  supabase/               browser, server, service-role, middleware
  data/queries.ts         server-side data helpers
  schemas/                Zod schemas
  time/aggregate.ts       work/break math from append-only events
  standups.ts             standup slot definitions + status logic
supabase/migrations/      SQL to run in Supabase
middleware.ts             session refresh + redirect rules
```

## Notes

- Time tracking is **append-only**: every login/break/logout inserts a row. Totals are
  derived in `lib/time/aggregate.ts`. This means time is auditable and the math is the
  same on the client (live ticking) and the server (reports).
- Row-Level Security enforces "employees only see their own data, admins see everyone."
  The admin write paths use the service-role key on the server only.
- Standup slots are stored in **GMT (UTC)** — `lib/standups.ts` converts to the user's
  local time for display.
