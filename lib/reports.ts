import { eventsToSession, formatDuration, MAX_DAILY_BREAK_MS } from "@/lib/time/aggregate";
import { JOB_STATUS_LABELS } from "@/lib/schemas/job-application";
import type { ActivityRollup } from "@/lib/data/activity-queries";
import type { JobApplication, TimeEvent } from "@/lib/types/database";

export type Period = "day" | "week" | "biweek" | "month";

export const PERIOD_LABELS: Record<Period, string> = {
  day: "Day",
  week: "Week",
  biweek: "Bi-week (14 days)",
  month: "Month",
};

// Returns the [start, end) date range for `period` ending on (or containing) `anchor`.
// "day": just the anchor day. "week": Mon→Sun containing anchor.
// "biweek": 14 days ending on anchor. "month": calendar month of anchor.
export function periodRange(period: Period, anchor: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const a = new Date(anchor);
  a.setHours(0, 0, 0, 0);

  if (period === "day") {
    const start = new Date(a);
    const end = new Date(a);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === "week") {
    const day = a.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(a);
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  if (period === "biweek") {
    const end = new Date(a);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 14);
    return { start, end };
  }
  // month
  const start = new Date(a.getFullYear(), a.getMonth(), 1);
  const end = new Date(a.getFullYear(), a.getMonth() + 1, 1);
  return { start, end };
}

export interface PeriodReport {
  period: Period;
  start: Date;
  end: Date;
  totalWorkMs: number;
  totalBreakMs: number;
  daysWorked: number;
  daysLate: number;
  totalLateMinutes: number;
  daysOverBreak: number;
  totalBreakOverageMs: number;
  jobsApplied: number;
  jobs: JobApplication[];
  byStatus: Record<string, number>;
  activity?: ActivityRollup;
}

// Aggregates events + jobs over the period range. Computes per-day session totals
// from the (still append-only) events table, sums them, plus tallies job applications.
export function aggregatePeriod(
  events: TimeEvent[],
  jobs: JobApplication[],
  start: Date,
  end: Date,
  period: Period,
  activity?: ActivityRollup,
): PeriodReport {
  // Group events by ISO day (in local time)
  const eventsByDay = new Map<string, TimeEvent[]>();
  for (const e of events) {
    const iso = new Date(e.occurred_at).toLocaleDateString("en-CA");
    const arr = eventsByDay.get(iso) ?? [];
    arr.push(e);
    eventsByDay.set(iso, arr);
  }

  let totalWorkMs = 0;
  let totalBreakMs = 0;
  let daysWorked = 0;
  let daysLate = 0;
  let totalLateMinutes = 0;
  let daysOverBreak = 0;
  let totalBreakOverageMs = 0;
  for (const [, dayEvents] of eventsByDay) {
    if (dayEvents.length === 0) continue;
    const lastEvent = dayEvents[dayEvents.length - 1];
    const dayDone = lastEvent.event_type === "logout";
    const ref = dayDone ? new Date(lastEvent.occurred_at) : new Date();
    const session = eventsToSession(dayEvents, ref);
    totalWorkMs += session.workMs;
    totalBreakMs += session.breakMs;
    daysWorked += 1;
    if ((session.lateMinutes ?? 0) > 0) {
      daysLate += 1;
      totalLateMinutes += session.lateMinutes ?? 0;
    }
    if (session.breakOverageMs > 0) {
      daysOverBreak += 1;
      totalBreakOverageMs += session.breakOverageMs;
    }
  }

  const byStatus: Record<string, number> = {};
  for (const j of jobs) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
  }

  return {
    period,
    start,
    end,
    totalWorkMs,
    totalBreakMs,
    daysWorked,
    daysLate,
    totalLateMinutes,
    daysOverBreak,
    totalBreakOverageMs,
    jobsApplied: jobs.length,
    jobs,
    byStatus,
    activity,
  };
}

// CSV escaping per RFC 4180: wrap in quotes, double internal quotes.
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const JOB_CSV_HEADERS = [
  "Date",
  "Platform",
  "Country",
  "City",
  "Company",
  "Job Nature",
  "Company Link",
  "Job Title",
  "Job Link",
  "Client Name",
  "Position",
  "Contact Email",
  "Status",
  "Interview Date",
  "Interview Time",
  "Feedback",
  "Comments",
  "Follow-up Date",
];

export function jobsToCsv(jobs: JobApplication[]): string {
  const rows = [JOB_CSV_HEADERS.join(",")];
  for (const j of jobs) {
    rows.push(
      [
        j.applied_date,
        j.platform,
        j.country,
        j.city,
        j.company,
        j.job_nature,
        j.company_link,
        j.job_title,
        j.job_link,
        j.client_name,
        j.position,
        j.contact_email,
        JOB_STATUS_LABELS[j.status],
        j.interview_date,
        j.interview_time,
        j.feedback,
        j.comments,
        j.follow_up_date,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return rows.join("\n");
}

export function reportSummaryCsv(report: PeriodReport): string {
  const lines: string[] = [];
  lines.push("DevNest period report");
  lines.push(`Period,${PERIOD_LABELS[report.period]}`);
  lines.push(`Start,${report.start.toISOString().slice(0, 10)}`);
  lines.push(`End,${report.end.toISOString().slice(0, 10)}`);
  lines.push(`Total work time,${formatDuration(report.totalWorkMs)}`);
  lines.push(`Total break time,${formatDuration(report.totalBreakMs)}`);
  lines.push(`Daily break cap,${formatDuration(MAX_DAILY_BREAK_MS)}`);
  lines.push(`Days worked,${report.daysWorked}`);
  lines.push(`Days late,${report.daysLate}`);
  lines.push(`Total minutes late,${report.totalLateMinutes}`);
  lines.push(`Days over break cap,${report.daysOverBreak}`);
  lines.push(`Total break overage,${formatDuration(report.totalBreakOverageMs)}`);
  lines.push(`Jobs applied,${report.jobsApplied}`);
  if (report.activity) {
    lines.push("");
    lines.push("Browser activity (from extension)");
    lines.push(`Productive time,${formatDuration(report.activity.productiveMs)}`);
    lines.push(`Neutral time,${formatDuration(report.activity.neutralMs)}`);
    lines.push(`Distracting time,${formatDuration(report.activity.distractingMs)}`);
    lines.push(`Idle time,${formatDuration(report.activity.idleMs)}`);
    if (report.activity.topSites.length > 0) {
      lines.push("");
      lines.push("Top sites,Time,Category");
      for (const s of report.activity.topSites) {
        lines.push(`${csvCell(s.hostname)},${formatDuration(s.ms)},${s.category}`);
      }
    }
  }
  lines.push("");
  lines.push("Status,Count");
  for (const [status, count] of Object.entries(report.byStatus)) {
    lines.push(`${csvCell(JOB_STATUS_LABELS[status as keyof typeof JOB_STATUS_LABELS] ?? status)},${count}`);
  }
  lines.push("");
  lines.push("Applications");
  lines.push(jobsToCsv(report.jobs));
  return lines.join("\n");
}
