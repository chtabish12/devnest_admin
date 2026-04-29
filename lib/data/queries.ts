import { createClient } from "@/lib/supabase/server";
import { dayBounds } from "@/lib/time/aggregate";
import type { StandupAttendance } from "@/lib/standups";
import type { JobApplication, Profile, TimeEvent } from "@/lib/types/database";

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
