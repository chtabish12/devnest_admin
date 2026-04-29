import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { DailyReportView } from "@/components/daily-report-view";
import { JobApplicationsTable } from "@/components/job-applications-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { dayBounds } from "@/lib/time/aggregate";
import type { StandupAttendance } from "@/lib/standups";
import type { JobApplication, Profile, TimeEvent } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { date?: string };
}) {
  const supabase = createClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!profileData) notFound();
  const profile = profileData as Profile;

  const target = searchParams.date ? new Date(searchParams.date) : new Date();
  const { start, end } = dayBounds(target);
  const isoDay = target.toISOString().slice(0, 10);

  const [eventsRes, jobsRes, allJobsRes, standupsRes] = await Promise.all([
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
      .eq("applied_date", isoDay)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_applications")
      .select("*")
      .eq("employee_id", profile.id)
      .order("applied_date", { ascending: false })
      .limit(50),
    supabase
      .from("standup_attendances")
      .select("*")
      .eq("employee_id", profile.id)
      .eq("standup_date", isoDay),
  ]);

  const events = (eventsRes.data as TimeEvent[]) ?? [];
  const dayJobs = (jobsRes.data as JobApplication[]) ?? [];
  const recentJobs = (allJobsRes.data as JobApplication[]) ?? [];
  const standups = (standupsRes.data as StandupAttendance[]) ?? [];
  const dayDone = events[events.length - 1]?.event_type === "logout";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/employees">← Back to employees</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>View report by date</CardTitle>
          <CardDescription>Pick a day to see this employee's activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex items-end gap-2">
            <div className="space-y-1.5">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={isoDay}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary">
              Update
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {format(target, "MMM d, yyyy")}
            </span>
          </form>
        </CardContent>
      </Card>

      <DailyReportView
        date={target}
        employeeName={profile.full_name}
        events={events}
        jobs={dayJobs}
        standups={standups}
        freeze={dayDone}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent applications (last 50)</h2>
        <JobApplicationsTable jobs={recentJobs} emptyMessage="No applications logged." />
      </div>

      {recentJobs.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Newest: {format(parseISO(recentJobs[0].applied_date), "MMM d, yyyy")}
        </p>
      ) : null}
    </div>
  );
}
