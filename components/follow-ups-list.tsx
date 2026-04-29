import Link from "next/link";
import { format, isPast, parseISO } from "date-fns";
import { CalendarClock, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JOB_STATUS_LABELS } from "@/lib/schemas/job-application";
import type { JobApplication } from "@/lib/types/database";

export function FollowUpsList({ jobs }: { jobs: JobApplication[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Follow-ups due
        </CardTitle>
        <CardDescription>
          Applications you marked for follow-up on or before today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to chase up. Go you.</p>
        ) : (
          <ul className="divide-y">
            {jobs.map((job) => {
              const due = job.follow_up_date ? parseISO(job.follow_up_date) : null;
              const overdue = due ? isPast(due) : false;
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">
                      {job.company || "Unknown company"}
                      {job.job_title ? <span className="text-muted-foreground"> — {job.job_title}</span> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Status: {JOB_STATUS_LABELS[job.status]} · Follow up:{" "}
                      {due ? format(due, "MMM d, yyyy") : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="warning">Due</Badge>}
                    <Link
                      href={`/dashboard/jobs/${job.id}/edit`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
