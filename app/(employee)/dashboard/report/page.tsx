import { DailyReportView } from "@/components/daily-report-view";
import {
  getCurrentProfile,
  getJobsForDate,
  getStandupAttendances,
  getTodayEvents,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function MyReportPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const today = new Date();
  const [events, jobs, standups] = await Promise.all([
    getTodayEvents(profile.id, today),
    getJobsForDate(profile.id, today),
    getStandupAttendances(profile.id, today),
  ]);

  const dayDone = events[events.length - 1]?.event_type === "logout";

  return (
    <DailyReportView
      date={today}
      employeeName={profile.full_name}
      events={events}
      jobs={jobs}
      standups={standups}
      freeze={dayDone}
    />
  );
}
