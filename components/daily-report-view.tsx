import { format, parseISO } from "date-fns";
import { Briefcase, CalendarClock, Clock, Coffee, Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobApplicationsTable } from "@/components/job-applications-table";
import { eventsToSession, formatDuration } from "@/lib/time/aggregate";
import { STANDUP_SLOTS, type StandupAttendance } from "@/lib/standups";
import type { JobApplication, TimeEvent } from "@/lib/types/database";

interface Props {
  date: Date;
  employeeName: string;
  events: TimeEvent[];
  jobs: JobApplication[];
  standups?: StandupAttendance[];
  // When true, the timer is "frozen" at the last event time (used for completed days
  // and admin views). When false (e.g. live today), totals extend to `now`.
  freeze?: boolean;
}

export function DailyReportView({ date, employeeName, events, jobs, standups, freeze }: Props) {
  const referenceTime = freeze ? new Date(events[events.length - 1]?.occurred_at ?? date) : new Date();
  const session = eventsToSession(events, referenceTime);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily report — {format(date, "EEEE, MMM d, yyyy")}</CardTitle>
          <CardDescription>{employeeName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Work time" value={formatDuration(session.workMs)} icon={<Clock className="h-4 w-4" />} />
          <Stat label="Break time" value={formatDuration(session.breakMs)} icon={<Coffee className="h-4 w-4" />} />
          <Stat
            label="Started / Ended"
            value={`${session.loginAt ? format(parseISO(session.loginAt), "p") : "—"} → ${
              session.logoutAt ? format(parseISO(session.logoutAt), "p") : "—"
            }`}
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <Stat
            label="Jobs logged today"
            value={String(jobs.length)}
            icon={<Briefcase className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Jobs applied this day</h2>
        <JobApplicationsTable
          jobs={jobs}
          emptyMessage="No applications logged for this day."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Standup attendance
          </CardTitle>
          <CardDescription>Three standups daily — 9:30, 12:00, 16:00 GMT.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-3">
            {STANDUP_SLOTS.map((slot) => {
              const att = standups?.find((a) => a.slot === slot.key);
              return (
                <li
                  key={slot.key}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span className="text-sm font-medium">{slot.label}</span>
                  {att ? (
                    <Badge variant="success">Attended</Badge>
                  ) : (
                    <Badge variant="muted">Missed</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
          <CardDescription>Every clock event recorded today.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                  <span className="font-medium capitalize">{e.event_type.replace("_", " ")}</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(e.occurred_at), "p")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums">{value}</div>
    </div>
  );
}
