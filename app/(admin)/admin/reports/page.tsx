import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { dayBounds, eventsToSession, formatDuration } from "@/lib/time/aggregate";
import type { JobApplication, Profile, TimeEvent } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createClient();
  const target = searchParams.date ? new Date(searchParams.date) : new Date();
  const { start, end } = dayBounds(target);
  const isoDay = target.toISOString().slice(0, 10);

  const [profilesRes, eventsRes, jobsRes, leavesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "employee"),
    supabase
      .from("time_events")
      .select("*")
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString()),
    supabase.from("job_applications").select("*").eq("applied_date", isoDay),
    supabase.from("leaves").select("employee_id, reason").eq("leave_date", isoDay),
  ]);

  const employees = (profilesRes.data as Profile[]) ?? [];
  const events = (eventsRes.data as TimeEvent[]) ?? [];
  const jobs = (jobsRes.data as JobApplication[]) ?? [];
  const leaveByEmployee = new Map<string, string | null>(
    ((leavesRes.data as { employee_id: string; reason: string | null }[]) ?? []).map((l) => [
      l.employee_id,
      l.reason,
    ]),
  );

  const eventsByEmployee = new Map<string, TimeEvent[]>();
  for (const evt of events) {
    const arr = eventsByEmployee.get(evt.employee_id) ?? [];
    arr.push(evt);
    eventsByEmployee.set(evt.employee_id, arr);
  }
  const jobsByEmployee = new Map<string, number>();
  for (const j of jobs) {
    jobsByEmployee.set(j.employee_id, (jobsByEmployee.get(j.employee_id) ?? 0) + 1);
  }

  const rows = employees.map((emp) => {
    const evts = eventsByEmployee.get(emp.id) ?? [];
    const dayDone = evts[evts.length - 1]?.event_type === "logout";
    const session = eventsToSession(evts, dayDone ? new Date(evts[evts.length - 1]!.occurred_at) : new Date());
    const onLeave = leaveByEmployee.has(emp.id);
    return {
      id: emp.id,
      name: emp.full_name,
      email: emp.email,
      session,
      jobsCount: jobsByEmployee.get(emp.id) ?? 0,
      hasActivity: evts.length > 0,
      onLeave,
      leaveReason: onLeave ? leaveByEmployee.get(emp.id) ?? null : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily reports</h1>
        <p className="text-sm text-muted-foreground">Across all employees, for a chosen day.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date</CardTitle>
          <CardDescription>Showing {format(target, "EEEE, MMM d, yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex items-end gap-2">
            <input
              name="date"
              type="date"
              defaultValue={isoDay}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary">
              Update
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Work time</TableHead>
              <TableHead>Break time</TableHead>
              <TableHead>Jobs logged</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No employees yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {r.onLeave
                      ? "on leave"
                      : r.hasActivity
                        ? r.session.status.replace("_", " ")
                        : "no activity"}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-xs">
                    {r.session.loginAt ? new Date(r.session.loginAt).toUTCString().slice(17, 22) + " GMT" : "—"}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatDuration(r.session.workMs)}
                  </TableCell>
                  <TableCell
                    className={
                      "font-mono tabular-nums " +
                      (r.session.breakOverageMs > 0 ? "text-destructive" : "")
                    }
                  >
                    {formatDuration(r.session.breakMs)}
                  </TableCell>
                  <TableCell>{r.jobsCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.onLeave ? (
                        <Badge variant="warning">
                          On leave{r.leaveReason ? ` — ${r.leaveReason}` : ""}
                        </Badge>
                      ) : null}
                      {!r.onLeave && r.session.isLate ? (
                        <Badge variant="destructive">Late {r.session.lateMinutes}m</Badge>
                      ) : null}
                      {r.session.breakOverageMs > 0 ? (
                        <Badge variant="destructive">Break +{formatDuration(r.session.breakOverageMs)}</Badge>
                      ) : null}
                      {!r.onLeave && r.hasActivity && !r.session.isLate && r.session.breakOverageMs === 0 ? (
                        <Badge variant="success">OK</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/employees/${r.id}?date=${isoDay}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
