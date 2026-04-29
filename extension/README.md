# DevNest Activity (Chrome extension)

Tracks how long an employee spends on each website while they're on the clock,
categorizes time as **productive / neutral / distracting**, and posts the data
to the DevNest Supabase backend so it shows up in their daily, weekly,
bi-weekly, and monthly reports.

## What it does

- Records the **active tab's hostname** (e.g. `linkedin.com`), the page title,
  and how long it was focused.
- Excludes idle time (no keyboard/mouse for 60 seconds → marked idle).
- Sends batches every 30 seconds to your Supabase `activity_sessions` table.
- Authenticates as the employee (Supabase Auth) — RLS ensures employees can
  only write their own rows.
- **Auto-pauses based on the DevNest portal's clock state**:
  - Day not started yet → paused
  - Working → tracking
  - On break → paused
  - End of day → paused
  - On leave today → paused
- Manual **Pause** button still available — overrides the auto behavior until
  you click Resume.

## What it does NOT do

- Doesn't take screenshots.
- Doesn't read page content (only the hostname, title, and time-on-tab).
- Doesn't track activity from other browsers (Safari, Firefox), other apps, or
  other devices. If an employee uses Firefox half the day, the Chrome extension
  has nothing to report for that.

## Install (Chrome / Edge / Brave / Arc)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Top right → toggle **Developer mode** ON.
3. Click **Load unpacked**.
4. Select this `extension/` folder.
5. The DevNest Activity icon appears in the toolbar.
6. Click it → sign in with the employee's email + password (the same credentials
   they use to log in to the DevNest portal).
7. Done. Tracking starts immediately. Click the icon any time to see status,
   pause/resume, or sign out.

## Settings

All hard-coded in [`config.js`](config.js):

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — already filled in to point at the
  DevNest project.
- `IDLE_THRESHOLD_SECONDS` — default 60 (no input for 60s → idle).
- `FLUSH_INTERVAL_SECONDS` — default 30 (sync to backend every 30s).
- `MIN_SESSION_MS` — default 3000 (don't log tab flips shorter than 3s).

## How time is categorized

[`lib/categories.js`](lib/categories.js) holds the hostname → category rules.
First match wins. To change them, edit that file and reload the extension at
`chrome://extensions`.

Defaults:
- **Productive**: LinkedIn, Indeed, Glassdoor, Upwork, Fiverr, GitHub, Slack,
  Gmail, Notion, etc. (job platforms + work tools).
- **Distracting**: YouTube, Netflix, Instagram, TikTok, Reddit, Amazon, news
  sites, etc.
- **Neutral**: anything else.

## Privacy

The extension only sends data after the employee signs in voluntarily, and they
can pause or sign out at any time. Make sure your team has consented to this
tracking before rolling it out — in many jurisdictions it's a legal requirement.

## Development notes

- Manifest V3 service worker (`background.js`).
- No build step; loads as plain ES modules.
- State machine: AT MOST ONE in-flight session at a time, persisted via
  `chrome.storage.session`. Closed sessions queue in `chrome.storage.local` and
  flush every 30s. If offline or signed out, the queue accumulates locally and
  syncs on next successful flush (capped at 1000 rows).

## Troubleshooting

**"Sign in" returns "Invalid login credentials"** — same Supabase email/password
they'd use at https://devnest-admin (or wherever the portal is hosted). If the
admin reset their password, the new password must be used here too.

**Status says "Idle" forever** — Chrome only marks active when there's
keyboard/mouse input. Move the mouse, then click the popup → "Sync now".

**Activity not showing in reports** — wait up to 30 seconds for the next flush.
Open the extension popup → check that the queue says "Synced — nothing pending."
If queue is non-empty for more than a few minutes, the user is probably offline
or signed out; sign in again and click "Sync now."
