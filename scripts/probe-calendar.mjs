// Quick connectivity probe: lists today's events on the configured calendar
// using the service account credentials from .env.local. Run with:
//   node --env-file=.env.local scripts/probe-calendar.mjs
import { google } from "googleapis";

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const calendarId = process.env.GOOGLE_CALENDAR_ID;

if (!email || !key || !calendarId) {
  console.error("Missing one or more env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID");
  process.exit(1);
}

console.log("Service account:", email);
console.log("Calendar ID:    ", calendarId);
console.log();

const auth = new google.auth.JWT({
  email,
  key,
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});

const calendar = google.calendar({ version: "v3", auth });

const now = new Date();
const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const dayEnd = new Date(dayStart);
dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

try {
  const res = await calendar.events.list({
    calendarId,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events = res.data.items ?? [];
  console.log(`Found ${events.length} events for ${now.toDateString()} UTC`);
  console.log();

  for (const evt of events) {
    const start = evt.start?.dateTime ?? evt.start?.date ?? "?";
    const meetUrl =
      evt.hangoutLink ??
      evt.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      "(no meet link)";
    console.log(`  • ${start} — ${evt.summary ?? "(no title)"}`);
    console.log(`    ${meetUrl}`);
  }

  if (events.length === 0) {
    console.log("(No events today. Try creating a test event titled 'Standup test'");
    console.log(" with a Google Meet link, then re-run this script.)");
  }
} catch (err) {
  console.error("API call failed:", err.message);
  if (err.message.includes("Not Found") || err.message.includes("notFound")) {
    console.error();
    console.error("👉 The calendar likely isn't shared with the service account yet.");
    console.error(`   Share '${calendarId}' with: ${email}`);
    console.error(`   Permission: 'See all event details'.`);
  }
  process.exit(1);
}
