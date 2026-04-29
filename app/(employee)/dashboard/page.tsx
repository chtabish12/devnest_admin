import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TimeTrackerCard } from "@/components/time-tracker-card";
import { FollowUpsList } from "@/components/follow-ups-list";
import { StandupsCard } from "@/components/standups-card";
import {
  getCurrentProfile,
  getDueFollowUps,
  getStandupAttendances,
  getTodayEvents,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [events, followUps, standups] = await Promise.all([
    getTodayEvents(profile.id),
    getDueFollowUps(profile.id),
    getStandupAttendances(profile.id),
  ]);

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

      <TimeTrackerCard events={events} />
      <StandupsCard attendances={standups} />
      <FollowUpsList jobs={followUps} />
    </div>
  );
}
