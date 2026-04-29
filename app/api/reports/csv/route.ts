import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  aggregatePeriod,
  periodRange,
  reportSummaryCsv,
  type Period,
} from "@/lib/reports";
import { getActivitySessions, rollupActivity } from "@/lib/data/activity-queries";
import type { JobApplication, TimeEvent } from "@/lib/types/database";

const VALID: Period[] = ["day", "week", "biweek", "month"];

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const periodParam = (url.searchParams.get("period") ?? "week") as Period;
  if (!VALID.includes(periodParam)) {
    return new NextResponse("Invalid period", { status: 400 });
  }
  const employeeIdParam = url.searchParams.get("employeeId");
  const dateParam = url.searchParams.get("date");
  const anchor = dateParam ? new Date(dateParam) : new Date();

  // Decide whose data to fetch. Admins can request any employee; non-admins get self.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";
  const targetId = isAdmin && employeeIdParam ? employeeIdParam : user.id;

  const { start, end } = periodRange(periodParam, anchor);

  const [eventsRes, jobsRes] = await Promise.all([
    supabase
      .from("time_events")
      .select("*")
      .eq("employee_id", targetId)
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: true }),
    supabase
      .from("job_applications")
      .select("*")
      .eq("employee_id", targetId)
      .gte("applied_date", start.toISOString().slice(0, 10))
      .lt("applied_date", end.toISOString().slice(0, 10))
      .order("applied_date", { ascending: false }),
  ]);

  const events = (eventsRes.data as TimeEvent[]) ?? [];
  const jobs = (jobsRes.data as JobApplication[]) ?? [];

  const activitySessions = await getActivitySessions(targetId, start, end);
  const activity = rollupActivity(activitySessions);

  const report = aggregatePeriod(events, jobs, start, end, periodParam, activity);
  const csv = reportSummaryCsv(report);

  const filename = `devnest-${periodParam}-${start.toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
