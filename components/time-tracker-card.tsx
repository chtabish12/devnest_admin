"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Coffee, LogIn, LogOut, Play, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eventsToSession, formatDuration } from "@/lib/time/aggregate";
import type { EventType, TimeEvent } from "@/lib/types/database";
import { recordTimeEvent } from "@/app/(employee)/dashboard/actions";

interface Props {
  events: TimeEvent[];
}

const STATUS_BADGE = {
  not_started: { label: "Not started", variant: "muted" as const },
  working: { label: "Working", variant: "success" as const },
  on_break: { label: "On break", variant: "warning" as const },
  done: { label: "Day complete", variant: "info" as const },
};

export function TimeTrackerCard({ events }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [pending, startTransition] = useTransition();

  const session = useMemo(() => eventsToSession(events, now), [events, now]);

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

  const badge = STATUS_BADGE[session.status];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Time tracker</CardTitle>
          <CardDescription>
            Punch in when you start, take breaks as needed, end your day when done.
          </CardDescription>
        </div>
        <Badge variant={badge.variant} className="shrink-0">
          {badge.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Work time" value={formatDuration(session.workMs)} highlight={session.status === "working"} />
          <Stat label="Break time" value={formatDuration(session.breakMs)} highlight={session.status === "on_break"} />
          <Stat label="Breaks taken" value={String(session.breakCount)} />
          <Stat
            label="Started"
            value={session.loginAt ? new Date(session.loginAt).toLocaleTimeString() : "—"}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {session.status === "not_started" && (
            <Button
              size="lg"
              onClick={() => handle("login", "You're clocked in")}
              disabled={pending}
            >
              <LogIn className="h-4 w-4" /> Login (start day)
            </Button>
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
            <Button size="lg" variant="outline" disabled>
              <Square className="h-4 w-4" /> Day complete — see your report
            </Button>
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 font-mono text-xl tabular-nums " + (highlight ? "text-emerald-600" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
