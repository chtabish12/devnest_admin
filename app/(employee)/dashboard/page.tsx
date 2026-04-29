import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TimeTrackerCard } from "@/components/time-tracker-card";
import { FollowUpsList } from "@/components/follow-ups-list";
import { StandupsCard } from "@/components/standups-card";
import { GoalsCard } from "@/components/goals-card";
import { ActivityCard } from "@/components/activity-card";
import { getActivitySessions, rollupActivity } from "@/lib/data/activity-queries";
import { dayBounds } from "@/lib/time/aggregate";
import {
  getCurrentProfile,
  getDailyJobCounts,
  getDueFollowUps,
  getLeaveForDate,
  getLeavesThisMonth,
  getStandupAttendances,
  getTodayEvents,
  MAX_LEAVES_PER_MONTH,
} from "@/lib/data/queries";
import { getStandupMeetings, isCalendarConfigured } from "@/lib/google-calendar";
import { computeWeekProgress, startOfWorkWeek } from "@/lib/goals";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekStart = startOfWorkWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { start: dayStart, end: dayEnd } = dayBounds(now);

  const [
    events,
    followUps,
    standups,
    meetings,
    dailyCounts,
    todayLeave,
    monthLeaves,
    activitySessions,
  ] = await Promise.all([
    getTodayEvents(profile.id, now),
    getDueFollowUps(profile.id),
    getStandupAttendances(profile.id, now),
    isCalendarConfigured() ? getStandupMeetings(todayIso) : Promise.resolve(undefined),
    getDailyJobCounts(profile.id, weekStart, weekEnd),
    getLeaveForDate(profile.id, now),
    getLeavesThisMonth(profile.id, now),
    getActivitySessions(profile.id, dayStart, dayEnd),
  ]);

  const activityRollup = rollupActivity(activitySessions);
  const extensionInstalled = activitySessions.length > 0;

  const weekProgress = computeWeekProgress(dailyCounts, now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">Here's your day at a glance.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">
            <Plus className="h-4 w-4" /> Log a job application
          </Link>
        </Button>
      </div>

      <TimeTrackerCard
        events={events}
        leaveToday={todayLeave ? { id: todayLeave.id, reason: todayLeave.reason } : null}
        leavesUsedThisMonth={monthLeaves.length}
        maxLeavesPerMonth={MAX_LEAVES_PER_MONTH}
      />
      <GoalsCard progress={weekProgress} />
      <StandupsCard attendances={standups} meetings={meetings} />
      <ActivityCard rollup={activityRollup} installed={extensionInstalled} />
      <FollowUpsList jobs={followUps} />
    </div>
  );
}
