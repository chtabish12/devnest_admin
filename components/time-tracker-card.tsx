"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarOff, Coffee, LogIn, LogOut, Play, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  eventsToSession,
  formatDuration,
  MAX_DAILY_BREAK_MS,
  WORK_START_HOUR_UTC,
  WORK_END_HOUR_UTC,
} from "@/lib/time/aggregate";
import { gmtWithZones, zonesBracketForDate } from "@/lib/time/zones";
import type { EventType, TimeEvent } from "@/lib/types/database";
import { recordTimeEvent } from "@/app/(employee)/dashboard/actions";
import {
  takeLeaveToday,
  cancelTodayLeave,
} from "@/app/(employee)/dashboard/leave-actions";

interface Props {
  events: TimeEvent[];
  leaveToday: { id: string; reason: string | null } | null;
  leavesUsedThisMonth: number;
  maxLeavesPerMonth: number;
}

const STATUS_BADGE = {
  not_started: { label: "Not started", variant: "muted" as const },
  working: { label: "Working", variant: "success" as const },
  on_break: { label: "On break", variant: "warning" as const },
  done: { label: "Day complete", variant: "info" as const },
};

export function TimeTrackerCard({
  events,
  leaveToday,
  leavesUsedThisMonth,
  maxLeavesPerMonth,
}: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [pending, startTransition] = useTransition();

  const session = useMemo(() => eventsToSession(events, now), [events, now]);
  const leavesRemaining = Math.max(0, maxLeavesPerMonth - leavesUsedThisMonth);
  const onLeaveToday = Boolean(leaveToday);
  const canTakeLeave = !onLeaveToday && events.length === 0 && leavesRemaining > 0;

  // Tick every second so the live timer updates.
  useEffect(() => {
    if (session.status === "done" || session.status === "not_started") return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [session.status]);

  const handle = (event: EventType, successMessage: string) => {
    startTransition(async () => {
      const res = await recordTimeEvent(event);
      if (res?.error) toast.error(res.error);
      else toast.success(successMessage);
    });
  };

  const handleTakeLeave = () => {
    startTransition(async () => {
      const res = await takeLeaveToday();
      if (res?.error) toast.error(res.error);
      else toast.success("Marked off for today");
    });
  };

  const handleCancelLeave = () => {
    startTransition(async () => {
      const res = await cancelTodayLeave();
      if (res?.error) toast.error(res.error);
      else toast.success("Leave cancelled");
    });
  };

  const badge = STATUS_BADGE[session.status];
  const breakOver = session.breakOverageMs > 0;
  const breakRemainingMs = Math.max(0, MAX_DAILY_BREAK_MS - session.breakMs);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Time tracker</CardTitle>
          <CardDescription>
            Work hours: {gmtWithZones(WORK_START_HOUR_UTC, 0)} –{" "}
            {gmtWithZones(WORK_END_HOUR_UTC, 0)} · Max break 1 hour/day.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {session.isLate ? (
            <Badge variant="destructive">Late by {session.lateMinutes}m</Badge>
          ) : null}
          {breakOver ? (
            <Badge variant="destructive">
              Break over by {formatDuration(session.breakOverageMs)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Work time" value={formatDuration(session.workMs)} highlight={session.status === "working"} />
          <Stat
            label={breakOver ? "Break time (over)" : "Break time"}
            value={`${formatDuration(session.breakMs)} / ${formatDuration(MAX_DAILY_BREAK_MS)}`}
            highlight={session.status === "on_break" && !breakOver}
            danger={breakOver}
          />
          <Stat label="Breaks taken" value={String(session.breakCount)} />
          <Stat
            label="Started"
            value={
              session.loginAt
                ? `${new Date(session.loginAt).toISOString().slice(11, 16)} GMT ${zonesBracketForDate(new Date(session.loginAt))}`
                : "—"
            }
          />
        </div>
        {session.status === "on_break" && breakRemainingMs > 0 && breakRemainingMs < 10 * 60_000 ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Heads up — only {formatDuration(breakRemainingMs)} of break time left today.
          </p>
        ) : null}

        {onLeaveToday ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>On leave today.</strong>
                {leaveToday?.reason ? (
                  <span className="ml-1 italic">"{leaveToday.reason}"</span>
                ) : null}
                <div className="mt-0.5 text-xs">
                  Leaves used this month: {leavesUsedThisMonth} / {maxLeavesPerMonth}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelLeave}
                disabled={pending}
              >
                Cancel leave
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!onLeaveToday && session.status === "not_started" && (
            <>
              <Button
                size="lg"
                onClick={() => handle("login", "You're clocked in")}
                disabled={pending}
              >
                <LogIn className="h-4 w-4" /> Login (start day)
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleTakeLeave}
                disabled={pending || !canTakeLeave}
                title={
                  leavesRemaining === 0
                    ? "No leaves left this month"
                    : `${leavesRemaining} leave${leavesRemaining === 1 ? "" : "s"} left this month`
                }
              >
                <CalendarOff className="h-4 w-4" /> Off today (on leave)
              </Button>
            </>
          )}

          {session.status === "working" && (
            <>
              <Button
                size="lg"
                variant="warning"
                onClick={() => handle("break_start", "Enjoy your break")}
                disabled={pending}
              >
                <Coffee className="h-4 w-4" /> Take break
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handle("logout", "Day ended — see your report")}
                disabled={pending}
              >
                <LogOut className="h-4 w-4" /> End of day
              </Button>
            </>
          )}

          {session.status === "on_break" && (
            <>
              <Button
                size="lg"
                variant="success"
                onClick={() => handle("break_end", "Welcome back")}
                disabled={pending}
              >
                <Play className="h-4 w-4" /> End break
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handle("logout", "Day ended — see your report")}
                disabled={pending}
              >
                <LogOut className="h-4 w-4" /> End of day
              </Button>
            </>
          )}

          {session.status === "done" && (
            <>
              <Button
                size="lg"
                onClick={() => handle("login", "Day resumed")}
                disabled={pending}
              >
                <RotateCw className="h-4 w-4" /> Resume day
              </Button>
              <Button size="lg" variant="outline" disabled>
                <Square className="h-4 w-4" /> Day complete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={
        "rounded-md border bg-card p-3 " +
        (danger ? "border-destructive bg-destructive/5" : "")
      }
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 font-mono text-xl tabular-nums " +
          (danger ? "text-destructive" : highlight ? "text-emerald-600" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
