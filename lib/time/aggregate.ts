import type { EventType, TimeEvent } from "@/lib/types/database";

export type WorkStatus = "not_started" | "working" | "on_break" | "done";

export interface SessionSummary {
  status: WorkStatus;
  workMs: number;
  breakMs: number;
  loginAt: string | null;
  logoutAt: string | null;
  breakCount: number;
  lastEventAt: string | null;
  lastEventType: EventType | null;
}

const ZERO: SessionSummary = {
  status: "not_started",
  workMs: 0,
  breakMs: 0,
  loginAt: null,
  logoutAt: null,
  breakCount: 0,
  lastEventAt: null,
  lastEventType: null,
};

// Walks the day's events (ordered ascending) and produces totals + current status.
// `now` lets the live timer extend the in-flight interval up to the current moment.
export function eventsToSession(events: TimeEvent[], now: Date = new Date()): SessionSummary {
  if (events.length === 0) return ZERO;

  const ordered = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  let workMs = 0;
  let breakMs = 0;
  let loginAt: string | null = null;
  let logoutAt: string | null = null;
  let breakCount = 0;

  // Track the start of the currently-open interval and what kind it is.
  let openStart: number | null = null;
  let openKind: "work" | "break" | null = null;

  for (const evt of ordered) {
    const t = new Date(evt.occurred_at).getTime();
    switch (evt.event_type) {
      case "login":
        if (!loginAt) loginAt = evt.occurred_at;
        openStart = t;
        openKind = "work";
        break;
      case "break_start":
        if (openKind === "work" && openStart !== null) workMs += t - openStart;
        openStart = t;
        openKind = "break";
        breakCount += 1;
        break;
      case "break_end":
        if (openKind === "break" && openStart !== null) breakMs += t - openStart;
        openStart = t;
        openKind = "work";
        break;
      case "logout":
        if (openKind === "work" && openStart !== null) workMs += t - openStart;
        else if (openKind === "break" && openStart !== null) breakMs += t - openStart;
        logoutAt = evt.occurred_at;
        openStart = null;
        openKind = null;
        break;
    }
  }

  // Extend the open interval up to `now` so the live timer ticks.
  if (openStart !== null && openKind !== null) {
    const live = now.getTime() - openStart;
    if (live > 0) {
      if (openKind === "work") workMs += live;
      else breakMs += live;
    }
  }

  const last = ordered[ordered.length - 1];
  const status: WorkStatus =
    last.event_type === "logout"
      ? "done"
      : last.event_type === "break_start"
        ? "on_break"
        : "working";

  return {
    status,
    workMs,
    breakMs,
    loginAt,
    logoutAt,
    breakCount,
    lastEventAt: last.occurred_at,
    lastEventType: last.event_type,
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Returns the start (inclusive) and end (exclusive) of the local day for `date`.
export function dayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
