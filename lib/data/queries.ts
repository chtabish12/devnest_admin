import { createClient } from "@/lib/supabase/server";
import { dayBounds } from "@/lib/time/aggregate";
import type { StandupAttendance } from "@/lib/standups";
import type { JobApplication, Profile, TimeEvent } from "@/lib/types/database";

export interface LeaveRow {
  id: string;
  employee_id: string;
  leave_date: string;
  reason: string | null;
  created_at: string;
}

export const MAX_LEAVES_PER_MONTH = 2;

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getTodayEvents(employeeId: string, date: Date = new Date()): Promise<TimeEvent[]> {
  const supabase = createClient();
  const { start, end } = dayBounds(date);
  const { data } = await supabase
    .from("time_events")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: true });
  return (data as TimeEvent[]) ?? [];
}

export async function getJobsForDate(employeeId: string, date: Date): Promise<JobApplication[]> {
  const supabase = createClient();
  const iso = date.toISOString().slice(0, 10);
  const { data } = await supabase
    .from("job_applications")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("applied_date", iso)
    .order("created_at", { ascending: false });
  return (data as JobApplication[]) ?? [];
}

export async function getStandupAttendances(
  employeeId: string,
  date: Date = new Date(),
): Promise<StandupAttendance[]> {
  const supabase = createClient();
  const iso = date.toISOString().slice(0, 10);
  const { data } = await supabase
    .from("standup_attendances")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("standup_date", iso);
  return (data as StandupAttendance[]) ?? [];
}

// Returns a Map of YYYY-MM-DD → applied count for `employeeId` from `start` (inclusive)
// to `end` (exclusive). Used by the weekly-goal progress card.
export async function getDailyJobCounts(
  employeeId: string,
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("job_applications")
    .select("applied_date")
    .eq("employee_id", employeeId)
    .gte("applied_date", start.toISOString().slice(0, 10))
    .lt("applied_date", end.toISOString().slice(0, 10));

  const counts = new Map<string, number>();
  for (const row of (data as { applied_date: string }[]) ?? []) {
    counts.set(row.applied_date, (counts.get(row.applied_date) ?? 0) + 1);
  }
  return counts;
}

export async function getLeavesThisMonth(
  employeeId: string,
  reference: Date = new Date(),
): Promise<LeaveRow[]> {
  const supabase = createClient();
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  const { data } = await supabase
    .from("leaves")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("leave_date", monthStart.toISOString().slice(0, 10))
    .lt("leave_date", monthEnd.toISOString().slice(0, 10))
    .order("leave_date", { ascending: true });
  return (data as LeaveRow[]) ?? [];
}

export async function getLeaveForDate(
  employeeId: string,
  date: Date,
): Promise<LeaveRow | null> {
  const supabase = createClient();
  const iso = date.toISOString().slice(0, 10);
  const { data } = await supabase
    .from("leaves")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("leave_date", iso)
    .maybeSingle();
  return (data as LeaveRow | null) ?? null;
}

export async function getDueFollowUps(employeeId: string): Promise<JobApplication[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("job_applications")
    .select("*")
    .eq("employee_id", employeeId)
    .lte("follow_up_date", today)
    .not("follow_up_date", "is", null)
    .not("status", "in", "(hired,rejected)")
    .order("follow_up_date", { ascending: true });
  return (data as JobApplication[]) ?? [];
}
