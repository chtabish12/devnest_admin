import { format } from "date-fns";
import { Briefcase, Clock, Coffee, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobApplicationsTable } from "@/components/job-applications-table";
import { ActivityCard } from "@/components/activity-card";
import { formatDuration } from "@/lib/time/aggregate";
import { JOB_STATUS_LABELS } from "@/lib/schemas/job-application";
import { PERIOD_LABELS, type PeriodReport } from "@/lib/reports";
import type { JobStatus } from "@/lib/types/database";

interface Props {
  report: PeriodReport;
  employeeName: string;
  csvHref: string;
}

export function PeriodReportView({ report, employeeName, csvHref }: Props) {
  const endInclusive = new Date(report.end);
  endInclusive.setDate(endInclusive.getDate() - 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {PERIOD_LABELS[report.period]} report — {format(report.start, "MMM d")} → {format(endInclusive, "MMM d, yyyy")}
            </CardTitle>
            <CardDescription>{employeeName}</CardDescription>
          </div>
          <Button asChild variant="outline">
            <a href={csvHref} download>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total work" value={formatDuration(report.totalWorkMs)} icon={<Clock className="h-4 w-4" />} />
          <Stat label="Total break" value={formatDuration(report.totalBreakMs)} icon={<Coffee className="h-4 w-4" />} />
          <Stat label="Days worked" value={String(report.daysWorked)} icon={<Clock className="h-4 w-4" />} />
          <Stat label="Jobs applied" value={String(report.jobsApplied)} icon={<Briefcase className="h-4 w-4" />} />
          <Stat
            label="Days late"
            value={
              report.daysLate === 0
                ? "0"
                : `${report.daysLate} (${report.totalLateMinutes}m total)`
            }
            icon={<Clock className="h-4 w-4" />}
            danger={report.daysLate > 0}
          />
          <Stat
            label="Days over break cap"
            value={
              report.daysOverBreak === 0
                ? "0"
                : `${report.daysOverBreak} (+${formatDuration(report.totalBreakOverageMs)})`
            }
            icon={<Coffee className="h-4 w-4" />}
            danger={report.daysOverBreak > 0}
          />
        </CardContent>
      </Card>

      {Object.keys(report.byStatus).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Outcomes</CardTitle>
            <CardDescription>Where your applications landed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.byStatus).map(([status, count]) => (
                <Badge key={status} variant="secondary" className="text-sm">
                  {JOB_STATUS_LABELS[status as JobStatus]}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {report.activity ? (
        <ActivityCard
          rollup={report.activity}
          installed={report.activity.totalMs > 0}
        />
      ) : null}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Applications in this period</h2>
        <JobApplicationsTable
          jobs={report.jobs}
          emptyMessage="No applications logged in this period."
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={
        "rounded-md border p-3 " +
        (danger ? "border-destructive bg-destructive/5" : "")
      }
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={
          "mt-1 font-mono text-lg tabular-nums " + (danger ? "text-destructive" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
