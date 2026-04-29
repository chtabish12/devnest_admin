import { google } from "googleapis";
import { unstable_cache } from "next/cache";

import { STANDUP_SLOTS, slotDateUTC, type StandupSlot } from "@/lib/standups";

export interface StandupMeeting {
  slot: StandupSlot;
  meetingUrl: string | null;
  eventId: string | null;
  eventTitle: string | null;
}

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Vercel/.env files store the private key as a single line with literal \n —
  // we need to convert those back to real newlines for JWT signing.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) return null;

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  return google.calendar({ version: "v3", auth });
}

// Read all standup events for `date` from the configured calendar, then match each
// to one of the three slots by event start time (closest within ±60 min).
async function fetchMeetingsForDate(date: Date): Promise<StandupMeeting[]> {
  const empty: StandupMeeting[] = STANDUP_SLOTS.map((s) => ({
    slot: s.key,
    meetingUrl: null,
    eventId: null,
    eventTitle: null,
  }));

  const calendar = getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendar || !calendarId) return empty;

  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0),
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  let events;
  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });
    events = res.data.items ?? [];
  } catch (err) {
    console.error("[google-calendar] fetch failed", err);
    return empty;
  }

  // Optional title filter — only consider events whose summary contains this keyword.
  const titleKeyword = process.env.GOOGLE_CALENDAR_EVENT_KEYWORD?.toLowerCase();

  const matchedSlots = new Set<StandupSlot>();
  const result = empty.map((s) => ({ ...s }));

  for (const slotDef of STANDUP_SLOTS) {
    if (matchedSlots.has(slotDef.key)) continue;

    const target = slotDateUTC(slotDef, date).getTime();
    let bestEvent: typeof events[number] | null = null;
    let bestDistance = Infinity;

    for (const evt of events) {
      const startStr = evt.start?.dateTime ?? evt.start?.date;
      if (!startStr) continue;
      if (titleKeyword && !(evt.summary ?? "").toLowerCase().includes(titleKeyword)) continue;

      const start = new Date(startStr).getTime();
      const distance = Math.abs(start - target);
      // Only count events within 60 min of the slot.
      if (distance > 60 * 60 * 1000) continue;

      if (distance < bestDistance) {
        bestEvent = evt;
        bestDistance = distance;
      }
    }

    if (bestEvent) {
      const meetingUrl =
        bestEvent.hangoutLink ??
        bestEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
        null;

      const idx = result.findIndex((r) => r.slot === slotDef.key);
      result[idx] = {
        slot: slotDef.key,
        meetingUrl,
        eventId: bestEvent.id ?? null,
        eventTitle: bestEvent.summary ?? null,
      };
      matchedSlots.add(slotDef.key);
    }
  }

  return result;
}

// Cache for 5 minutes — calendar events don't change often, and Calendar API has quotas.
export const getStandupMeetings = unstable_cache(
  async (isoDate: string) => {
    const date = new Date(isoDate);
    return fetchMeetingsForDate(date);
  },
  ["google-calendar-standup-meetings"],
  { revalidate: 300, tags: ["calendar-meetings"] },
);

export function isCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}
