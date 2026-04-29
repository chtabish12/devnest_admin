// Standup slots in GMT (UTC). 9:30, 12:00, 16:00.
export type StandupSlot = "morning" | "midday" | "afternoon";

export interface StandupSlotDef {
  key: StandupSlot;
  label: string;
  hourUTC: number;
  minuteUTC: number;
}

export const STANDUP_SLOTS: StandupSlotDef[] = [
  { key: "morning", label: "Morning standup", hourUTC: 9, minuteUTC: 30 },
  { key: "midday", label: "Midday standup", hourUTC: 12, minuteUTC: 0 },
  { key: "afternoon", label: "Afternoon standup", hourUTC: 16, minuteUTC: 0 },
];

export interface StandupAttendance {
  id: string;
  employee_id: string;
  standup_date: string;
  slot: StandupSlot;
  attended_at: string;
  notes: string | null;
}

// Returns the UTC Date for a given slot on a given (UTC) date.
export function slotDateUTC(slot: StandupSlotDef, date: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      slot.hourUTC,
      slot.minuteUTC,
      0,
      0,
    ),
  );
  return d;
}

export type SlotStatus = "upcoming" | "active" | "missed" | "attended";

// 15-minute window around the slot time = "active" / window for marking attendance.
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export function slotStatus(
  slot: StandupSlotDef,
  attendance: StandupAttendance | undefined,
  now: Date = new Date(),
): SlotStatus {
  if (attendance) return "attended";
  const slotTime = slotDateUTC(slot, now).getTime();
  const diff = now.getTime() - slotTime;
  if (Math.abs(diff) <= ACTIVE_WINDOW_MS) return "active";
  if (diff < 0) return "upcoming";
  return "missed";
}
