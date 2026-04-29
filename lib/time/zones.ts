// Display helpers for the timezones DevNest cares about: UTC/GMT and the
// team's "local" time (labelled PKT in the UI). The offset below is what's
// actually displayed — adjust here if your team relocates.
//
// Note: real Pakistan Standard Time is UTC+5 year-round. The +4 setting below
// matches the diff DevNest wants displayed against GMT. If you ever onboard
// someone whose true local time is UTC+5, their stats here will read 1 hour
// behind the wall clock — change PK_OFFSET_HOURS to 5 in that case.

const PK_OFFSET_HOURS = 4;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatMinutesAsHHMM(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440; // wrap 0..1440
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

// Format the given UTC hour:minute as "(14:30 PKT)".
export function zonesBracket(utcHour: number, utcMinute: number): string {
  const pktMinutes = utcHour * 60 + utcMinute + PK_OFFSET_HOURS * 60;
  return `(${formatMinutesAsHHMM(pktMinutes)} PKT)`;
}

// Format any UTC timestamp's PKT time in brackets.
export function zonesBracketForDate(date: Date): string {
  const pktMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + PK_OFFSET_HOURS * 60;
  return `(${formatMinutesAsHHMM(pktMinutes)} PKT)`;
}

// "09:30 GMT (14:30 PKT)"
export function gmtWithZones(utcHour: number, utcMinute: number): string {
  return `${pad2(utcHour)}:${pad2(utcMinute)} GMT ${zonesBracket(utcHour, utcMinute)}`;
}
