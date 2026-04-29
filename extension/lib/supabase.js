// Minimal fetch-based Supabase client for the extension. Avoids the SDK so
// the extension stays small and doesn't need a build step.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const STORAGE_KEY_SESSION = "devnest.session";

// --- Session management (token storage in chrome.storage.local) ---

export async function getStoredSession() {
  const data = await chrome.storage.local.get(STORAGE_KEY_SESSION);
  return data[STORAGE_KEY_SESSION] ?? null;
}

async function setStoredSession(session) {
  if (session) {
    await chrome.storage.local.set({ [STORAGE_KEY_SESSION]: session });
  } else {
    await chrome.storage.local.remove(STORAGE_KEY_SESSION);
  }
}

export async function clearSession() {
  await setStoredSession(null);
}

// --- Auth ---

export async function signIn(email, password) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error_description || body.error || body.msg || "Sign in failed");
  }
  const session = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
    user: body.user,
  };
  await setStoredSession(session);
  return session;
}

export async function refreshSession() {
  const session = await getStoredSession();
  if (!session?.refresh_token) return null;

  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    },
  );
  if (!res.ok) {
    await clearSession();
    return null;
  }
  const body = await res.json();
  const next = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
    user: body.user ?? session.user,
  };
  await setStoredSession(next);
  return next;
}

export async function getValidSession() {
  let session = await getStoredSession();
  if (!session) return null;
  // Refresh if expiring within the next 5 minutes.
  if (session.expires_at - Date.now() < 5 * 60 * 1000) {
    session = await refreshSession();
  }
  return session;
}

// --- DB inserts ---

export async function insertActivitySessions(rows) {
  if (rows.length === 0) return;
  const session = await getValidSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_sessions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert failed (${res.status}): ${text}`);
  }
}

export async function fetchProfile() {
  const session = await getValidSession();
  if (!session) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=full_name,role`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}

// Returns the employee's current desired tracking state by reading their
// latest time_event today and any active leave row.
//
// 'tracking'        — should be running (working)
// 'paused-not-started' — day hasn't started yet
// 'paused-break'    — currently on a break
// 'paused-done'     — clocked out for the day
// 'paused-leave'    — on leave today
// null              — couldn't determine (offline, signed out, etc.); leave state alone
export async function fetchEmployeeState() {
  const session = await getValidSession();
  if (!session) return null;

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const isoDay = start.toISOString().slice(0, 10);
  const userId = session.user.id;

  try {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    };

    const [leaveRes, eventsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/leaves?employee_id=eq.${userId}&leave_date=eq.${isoDay}&select=id&limit=1`,
        { headers },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/time_events?employee_id=eq.${userId}&occurred_at=gte.${start.toISOString()}&occurred_at=lt.${end.toISOString()}&order=occurred_at.desc&limit=1&select=event_type`,
        { headers },
      ),
    ]);

    if (!leaveRes.ok || !eventsRes.ok) return null;

    const leaves = await leaveRes.json();
    if (Array.isArray(leaves) && leaves.length > 0) return "paused-leave";

    const events = await eventsRes.json();
    if (!Array.isArray(events) || events.length === 0) return "paused-not-started";

    const lastType = events[0].event_type;
    if (lastType === "logout") return "paused-done";
    if (lastType === "break_start") return "paused-break";
    return "tracking"; // login or break_end
  } catch (err) {
    console.warn("[devnest] fetchEmployeeState:", err);
    return null;
  }
}
