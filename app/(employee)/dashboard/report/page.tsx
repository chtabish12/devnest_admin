import { DailyReportView } from "@/components/daily-report-view";
import { PeriodReportView } from "@/components/period-report-view";
import { PeriodTabs } from "@/components/period-tabs";
import {
  getCurrentProfile,
  getJobsForDate,
  getLeaveForDate,
  getStandupAttendances,
  getTodayEvents,
} from "@/lib/data/queries";
import { getActivitySessions, rollupActivity } from "@/lib/data/activity-queries";
import { createClient } from "@/lib/supabase/server";
import { aggregatePeriod, periodRange, type Period } from "@/lib/reports";
import { dayBounds } from "@/lib/time/aggregate";
import type { JobApplication, TimeEvent } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const VALID: Period[] = ["day", "week", "biweek", "month"];

export default async function MyReportPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const periodParam = (searchParams.period ?? "day") as Period;
  const period = VALID.includes(periodParam) ? periodParam : "day";
  const now = new Date();

  // "day" keeps the rich daily view (standups + activity timeline).
  if (period === "day") {
    const { start: dayStart, end: dayEnd } = dayBounds(now);
    const [events, jobs, standups, leave, activitySessions] = await Promise.all([
      getTodayEvents(profile.id, now),
      getJobsForDate(profile.id, now),
      getStandupAttendances(profile.id, now),
      getLeaveForDate(profile.id, now),
      getActivitySessions(profile.id, dayStart, dayEnd),
    ]);
    const dayDone = events[events.length - 1]?.event_type === "logout";
    const activityRollup = rollupActivity(activitySessions);
    const activityInstalled = activitySessions.length > 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Switch periods to see weekly, bi-weekly, or monthly views.
            </p>
          </div>
          <PeriodTabs active={period} />
        </div>
        <DailyReportView
          date={now}
          employeeName={profile.full_name}
          events={events}
          jobs={jobs}
          standups={standups}
          leave={leave ? { id: leave.id, reason: leave.reason } : null}
          activity={activityRollup}
          activityInstalled={activityInstalled}
          freeze={dayDone}
        />
      </div>
    );
  }

  const { start, end } = periodRange(period, now);
  const supabase = createClient();
  const [eventsRes, jobsRes, activitySessionsForPeriod] = await Promise.all([
    supabase
      .from("time_events")
      .select("*")
      .eq("employee_id", profile.id)
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: true }),
    supabase
      .from("job_applications")
      .select("*")
      .eq("employee_id", profile.id)
      .gte("applied_date", start.toISOString().slice(0, 10))
      .lt("applied_date", end.toISOString().slice(0, 10))
      .order("applied_date", { ascending: false }),
    getActivitySessions(profile.id, start, end),
  ]);

  const events = (eventsRes.data as TimeEvent[]) ?? [];
  const jobs = (jobsRes.data as JobApplication[]) ?? [];
  const periodActivity = rollupActivity(activitySessionsForPeriod);
  const report = aggregatePeriod(events, jobs, start, end, period, periodActivity);
  const csvHref = `/api/reports/csv?period=${period}&date=${now.toISOString().slice(0, 10)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Switch periods to see daily, weekly, bi-weekly, or monthly views.
          </p>
        </div>
        <PeriodTabs active={period} />
      </div>
      <PeriodReportView report={report} employeeName={profile.full_name} csvHref={csvHref} />
    </div>
  );
}
