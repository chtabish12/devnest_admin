import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ExternalLink, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOB_STATUS_LABELS } from "@/lib/schemas/job-application";
import type { JobApplication, JobStatus } from "@/lib/types/database";

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "muted"> = {
  applied: "info",
  interview_scheduled: "warning",
  interviewed: "warning",
  offered: "success",
  hired: "success",
  rejected: "destructive",
  no_response: "muted",
};

interface Props {
  jobs: JobApplication[];
  showEmployee?: boolean;
  emptyMessage?: string;
}

export function JobApplicationsTable({ jobs, showEmployee, emptyMessage }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No applications yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Follow-up</TableHead>
            {showEmployee ? <TableHead>Employee</TableHead> : null}
            <TableHead className="text-right">Links</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((j) => (
            <TableRow key={j.id}>
              <TableCell className="whitespace-nowrap">
                {format(parseISO(j.applied_date), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="font-medium">{j.company || "—"}</TableCell>
              <TableCell>{j.job_title || "—"}</TableCell>
              <TableCell>{j.platform || "—"}</TableCell>
              <TableCell>
                {[j.city, j.country].filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[j.status]}>{JOB_STATUS_LABELS[j.status]}</Badge>
              </TableCell>
              <TableCell>
                {j.follow_up_date ? format(parseISO(j.follow_up_date), "MMM d") : "—"}
              </TableCell>
              {showEmployee ? <TableCell>{(j as JobApplication & { employee_name?: string }).employee_name ?? "—"}</TableCell> : null}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {j.company_link ? (
                    <a
                      href={j.company_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Company"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                  {j.job_link ? (
                    <a
                      href={j.job_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Job"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/jobs/${j.id}/edit`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
