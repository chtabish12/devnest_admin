// DevNest activity tracker — service worker.
//
// State machine: at any moment we hold AT MOST ONE "current session" — the tab
// the user is currently focused on. When focus changes (tab switch, window
// switch, navigation) or the user goes idle, we close the current session,
// queue it for upload, and start a new one if applicable.
//
// Sessions are queued in chrome.storage.local and flushed every 30s. If the
// extension is signed out or offline, sessions accumulate locally until next
// sync.

import { categorize } from "./lib/categories.js";
import {
  fetchEmployeeState,
  getStoredSession,
  insertActivitySessions,
} from "./lib/supabase.js";
import {
  IDLE_THRESHOLD_SECONDS,
  FLUSH_INTERVAL_SECONDS,
  MIN_SESSION_MS,
  DEBUG,
} from "./config.js";

const log = (...args) => DEBUG && console.log("[devnest]", ...args);

const QUEUE_KEY = "devnest.queue";
// Pause state — split so a manual pause survives auto-sync, and an auto-pause
// can clear itself on the next sync without overriding manual intent.
const PAUSE_KEY = "devnest.paused";              // boolean: effective paused state
const PAUSE_REASON_KEY = "devnest.pause_reason"; // 'manual' | 'leave' | 'not_started' | 'break' | 'done' | null

// In-memory mirror of the "currently focused tab session" (only one at a time).
// The service worker may be killed by Chrome between events; we persist this
// in chrome.storage.session (volatile, cleared on browser restart) so handlers
// can resume after wake-up.
const CURRENT_KEY = "devnest.current";

// --- Helpers --------------------------------------------------------------

async function isPaused() {
  const data = await chrome.storage.local.get(PAUSE_KEY);
  return Boolean(data[PAUSE_KEY]);
}

async function getPauseReason() {
  const data = await chrome.storage.local.get(PAUSE_REASON_KEY);
  return data[PAUSE_REASON_KEY] ?? null;
}

async function setPaused(paused, reason = null) {
  await chrome.storage.local.set({
    [PAUSE_KEY]: paused,
    [PAUSE_REASON_KEY]: paused ? reason : null,
  });
}

async function readCurrent() {
  const data = await chrome.storage.session.get(CURRENT_KEY);
  return data[CURRENT_KEY] ?? null;
}

async function writeCurrent(value) {
  if (value) await chrome.storage.session.set({ [CURRENT_KEY]: value });
  else await chrome.storage.session.remove(CURRENT_KEY);
}

async function readQueue() {
  const data = await chrome.storage.local.get(QUEUE_KEY);
  return data[QUEUE_KEY] ?? [];
}

async function writeQueue(rows) {
  await chrome.storage.local.set({ [QUEUE_KEY]: rows });
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// --- Core state machine ---------------------------------------------------

async function startSession({ url, title, idle }) {
  if (await isPaused()) {
    log("startSession skipped — paused");
    return;
  }
  const host = hostnameOf(url);
  if (!host) {
    log("startSession skipped — no hostname for", url);
    return;
  }
  await writeCurrent({
    hostname: host,
    url,
    title: title ?? "",
    started_at: new Date().toISOString(),
    was_idle: Boolean(idle),
  });
  log("startSession", host);
}

async function endSession({ idleOverride } = {}) {
  const current = await readCurrent();
  if (!current) return;

  const startedMs = new Date(current.started_at).getTime();
  const endedMs = Date.now();
  const duration = endedMs - startedMs;

  await writeCurrent(null);
  if (duration < MIN_SESSION_MS) {
    log("endSession dropped (too short)", current.hostname, duration, "ms");
    return;
  }

  const wasIdle = idleOverride !== undefined ? idleOverride : current.was_idle;
  const session = await getStoredSession();
  if (!session?.user?.id) {
    log("endSession dropped (not signed in)", current.hostname);
    return;
  }

  const row = {
    employee_id: session.user.id,
    hostname: current.hostname,
    url: current.url,
    title: current.title,
    started_at: current.started_at,
    ended_at: new Date(endedMs).toISOString(),
    duration_ms: duration,
    was_idle: wasIdle,
    category: categorize(current.hostname),
  };

  const queue = await readQueue();
  queue.push(row);
  await writeQueue(queue);
  log("endSession queued", current.hostname, Math.round(duration / 1000), "s,", wasIdle ? "idle" : "active");
}

async function transitionTo({ url, title }) {
  await endSession();
  await startSession({ url, title });
}

// --- Event handlers -------------------------------------------------------

async function handleActiveTab(tab) {
  if (!tab || !tab.url) return;
  const current = await readCurrent();
  // No-op if it's the same URL we already track.
  if (current && current.url === tab.url) return;
  await transitionTo({ url: tab.url, title: tab.title });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await handleActiveTab(tab);
  } catch (err) {
    console.warn("[devnest] onActivated:", err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (changeInfo.url || changeInfo.title) {
    await handleActiveTab(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Chrome lost focus → end the active session
    await endSession();
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) await handleActiveTab(tab);
  } catch (err) {
    console.warn("[devnest] onFocusChanged:", err);
  }
});

chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "active") {
    // Re-pick the currently active tab and start fresh.
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) await handleActiveTab(tab);
  } else {
    // idle or locked → end current and don't start a new one until active again
    await endSession({ idleOverride: true });
  }
});

// --- Periodic flush -------------------------------------------------------

chrome.alarms.create("flush", { periodInMinutes: FLUSH_INTERVAL_SECONDS / 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "flush") return;
  await flush();
});

// Pick up whichever tab is active right now and start a session for it.
// Call after install/startup/sign-in — Chrome doesn't fire onActivated for the
// already-focused tab, so without this we sit idle until the user switches tabs.
async function pickUpActiveTab() {
  if (await isPaused()) return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab) await handleActiveTab(tab);
}

// Sync state on browser/extension start so the user doesn't wait 30s after sign-in.
chrome.runtime.onStartup.addListener(async () => {
  try {
    await syncPauseFromClock();
    await pickUpActiveTab();
  } catch (err) {
    console.warn("[devnest] onStartup:", err);
  }
});
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await syncPauseFromClock();
    await pickUpActiveTab();
  } catch (err) {
    console.warn("[devnest] onInstalled:", err);
  }
});

async function flush() {
  log("flush start");
  await endSession();
  await syncPauseFromClock();

  const session = await getStoredSession();
  if (!session?.user?.id) {
    log("flush skipped — not signed in");
    return;
  }

  const queue = await readQueue();

  try {
    if (queue.length > 0) {
      log("flush uploading", queue.length, "rows");
      await insertActivitySessions(queue);
      await writeQueue([]);
    } else {
      log("flush — queue empty");
    }
  } catch (err) {
    console.warn("[devnest] flush failed (will retry):", err);
    if (queue.length > 1000) await writeQueue(queue.slice(-1000));
  } finally {
    if (!(await isPaused())) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) await handleActiveTab(tab);
    }
  }
}

// Maps a "desired tracking state" from the web app onto extension pause flags.
// Manual pauses (set via the popup) are NOT overridden — only auto-* reasons
// are touched here.
async function syncPauseFromClock() {
  const reason = await getPauseReason();
  if (reason === "manual") return; // user explicitly paused; don't touch

  const state = await fetchEmployeeState();
  if (state === null) return; // can't determine; leave alone

  if (state === "tracking") {
    if (await isPaused()) {
      await setPaused(false);
    }
    return;
  }

  // Any other state means we should be paused with the matching reason.
  const desiredReason = state.replace("paused-", ""); // 'leave' | 'not_started' | 'break' | 'done'
  if (!(await isPaused()) || (await getPauseReason()) !== desiredReason) {
    await endSession(); // close any in-flight tab session before pausing
    await setPaused(true, desiredReason);
  }
}

// --- Popup messages -------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "FLUSH_NOW") {
      await flush();
      sendResponse({ ok: true });
    } else if (msg?.type === "PAUSE") {
      await endSession();
      await setPaused(true, "manual");
      sendResponse({ ok: true });
    } else if (msg?.type === "RESUME") {
      // Manual resume — but only if the auto state allows it.
      await setPaused(false);
      await syncPauseFromClock();
      if (!(await isPaused())) {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab) await handleActiveTab(tab);
      }
      sendResponse({ ok: true });
    } else if (msg?.type === "STATUS") {
      const [paused, reason, current, queue] = await Promise.all([
        isPaused(),
        getPauseReason(),
        readCurrent(),
        readQueue(),
      ]);
      sendResponse({ paused, reason, current, queueLength: queue.length });
    }
  })();
  return true; // keep channel open for async sendResponse
});
