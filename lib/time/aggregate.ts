import type { EventType, TimeEvent } from "@/lib/types/database";

export type WorkStatus = "not_started" | "working" | "on_break" | "done";

// Work day expectations (UTC).
export const WORK_START_HOUR_UTC = 9; // 09:00 GMT
export const WORK_END_HOUR_UTC = 18; // 18:00 GMT
// Internal grace window. Logins within this many minutes of 09:00 are not flagged.
// Intentionally not surfaced in user-facing copy.
const LATE_GRACE_MINUTES = 5;
export const MAX_DAILY_BREAK_MS = 60 * 60 * 1000; // 1 hour total break per day

export interface SessionSummary {
  status: WorkStatus;
  workMs: number;
  breakMs: number;
  loginAt: string | null;
  logoutAt: string | null;
  breakCount: number;
  lastEventAt: string | null;
  lastEventType: EventType | null;
  // Total minutes after 09:00 GMT the day's first `login` event happened.
  // 0 if on time/early, null if no login yet.
  lateMinutes: number | null;
  // Whether to flag this login as late (true once lateMinutes exceeds the grace window).
  isLate: boolean;
  // Break ms used beyond MAX_DAILY_BREAK_MS. 0 if within the 1-hour limit.
  breakOverageMs: number;
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
  lateMinutes: null,
  isLate: false,
  breakOverageMs: 0,
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

  // Compute late minutes vs 09:00 GMT on the day of the login.
  let lateMinutes: number | null = null;
  let isLate = false;
  if (loginAt) {
    const loginDate = new Date(loginAt);
    const startOfWorkDay = new Date(
      Date.UTC(
        loginDate.getUTCFullYear(),
        loginDate.getUTCMonth(),
        loginDate.getUTCDate(),
        WORK_START_HOUR_UTC,
        0,
        0,
        0,
      ),
    );
    const diffMin = (loginDate.getTime() - startOfWorkDay.getTime()) / 60_000;
    lateMinutes = Math.max(0, Math.round(diffMin));
    isLate = diffMin > LATE_GRACE_MINUTES;
  }

  const breakOverageMs = Math.max(0, breakMs - MAX_DAILY_BREAK_MS);

  return {
    status,
    workMs,
    breakMs,
    loginAt,
    logoutAt,
    breakCount,
    lastEventAt: last.occurred_at,
    lastEventType: last.event_type,
    lateMinutes,
    isLate,
    breakOverageMs,
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
