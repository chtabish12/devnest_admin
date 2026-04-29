"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Clock, ExternalLink, Megaphone, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STANDUP_SLOTS,
  slotStatus,
  type StandupAttendance,
  type StandupSlot,
} from "@/lib/standups";
import { gmtWithZones } from "@/lib/time/zones";
import { markStandupAttended } from "@/app/(employee)/dashboard/standup-actions";

export interface StandupMeetingInfo {
  slot: StandupSlot;
  meetingUrl: string | null;
}

interface Props {
  attendances: StandupAttendance[];
  meetings?: StandupMeetingInfo[];
  readOnly?: boolean;
}

const STATUS_BADGE = {
  upcoming: { label: "Upcoming", variant: "muted" as const },
  active: { label: "Happening now", variant: "warning" as const },
  missed: { label: "Missed", variant: "destructive" as const },
  attended: { label: "Attended", variant: "success" as const },
};

export function StandupsCard({ attendances, meetings, readOnly }: Props) {
  const meetingByKey = new Map((meetings ?? []).map((m) => [m.slot, m]));
  // Refresh status every minute so badges update across slot transitions.
  const [now, setNow] = useState<Date>(() => new Date());
  const [pending, startTransition] = useTransition();
  const [pendingSlot, setPendingSlot] = useState<StandupSlot | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const byKey = new Map(attendances.map((a) => [a.slot, a]));

  const onMark = (slot: StandupSlot) => {
    setPendingSlot(slot);
    startTransition(async () => {
      const res = await markStandupAttended(slot);
      setPendingSlot(null);
      if (res?.error) toast.error(res.error);
      else toast.success("Marked as attended");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Standups
        </CardTitle>
        <CardDescription>
          Three standups daily — start times below in GMT (PKT and UK in brackets).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-3">
          {STANDUP_SLOTS.map((slot) => {
            const attendance = byKey.get(slot.key);
            const status = slotStatus(slot, attendance, now);
            const badge = STATUS_BADGE[status];
            return (
              <li
                key={slot.key}
                className="flex flex-col gap-2 rounded-md border bg-card p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{slot.label}</span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-mono">
                    {gmtWithZones(slot.hourUTC, slot.minuteUTC)}
                  </span>
                </div>
                {meetingByKey.get(slot.key)?.meetingUrl ? (
                  <a
                    href={meetingByKey.get(slot.key)!.meetingUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join meeting
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                {!readOnly && status !== "attended" ? (
                  <Button
                    size="sm"
                    variant={status === "active" ? "default" : "outline"}
                    onClick={() => onMark(slot.key)}
                    disabled={pending && pendingSlot === slot.key}
                  >
                    <Check className="h-4 w-4" />
                    {status === "missed" ? "Mark anyway" : "I'm here"}
                  </Button>
                ) : null}
                {status === "attended" && attendance ? (
                  <p className="text-xs text-muted-foreground">
                    Joined at {new Date(attendance.attended_at).toISOString().slice(11, 16)} GMT
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
