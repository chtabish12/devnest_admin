import {
  signIn,
  clearSession,
  getStoredSession,
  fetchProfile,
} from "./lib/supabase.js";

const $ = (id) => document.getElementById(id);

async function refresh() {
  const session = await getStoredSession();
  const signedIn = Boolean(session?.access_token);
  $("signed-in").classList.toggle("hidden", !signedIn);
  $("signed-out").classList.toggle("hidden", signedIn);

  if (signedIn) {
    const profile = await fetchProfile();
    $("signed-in-name").textContent =
      profile?.full_name ?? session.user?.email ?? "Signed in";

    chrome.runtime.sendMessage({ type: "STATUS" }, (status) => {
      if (chrome.runtime.lastError || !status) return;
      const pause = $("pause-btn");
      const trackingState = $("tracking-state");
      const statusPill = $("status-pill");
      const currentHost = $("current-host");
      const queueInfo = $("queue-info");

      const REASON_LABEL = {
        manual: "Paused (you)",
        leave: "Auto-paused — on leave",
        not_started: "Auto-paused — day not started",
        break: "Auto-paused — on break",
        done: "Auto-paused — day ended",
      };

      if (status.paused) {
        const label = REASON_LABEL[status.reason] ?? "Paused";
        trackingState.textContent = label;
        trackingState.className = "pill pill-warning";
        statusPill.textContent = "Paused";
        statusPill.className = "pill pill-warning";
        // Resume button only enabled for manual pauses; auto-pauses are
        // controlled by the web app's clock state.
        pause.textContent =
          status.reason === "manual" ? "Resume tracking" : "Auto (synced with portal)";
        pause.disabled = status.reason !== "manual";
      } else {
        trackingState.textContent = status.current ? "Active" : "Idle";
        trackingState.className = status.current ? "pill pill-success" : "pill pill-muted";
        statusPill.textContent = status.current ? "Tracking" : "Idle";
        statusPill.className = status.current ? "pill pill-success" : "pill pill-muted";
        pause.textContent = "Pause tracking";
        pause.disabled = false;
      }

      currentHost.textContent = status.current
        ? status.current.hostname
        : "Not tracking any tab right now";
      queueInfo.textContent =
        status.queueLength === 0
          ? "Synced — nothing pending."
          : `${status.queueLength} session${status.queueLength === 1 ? "" : "s"} pending sync.`;
    });
  } else {
    $("status-pill").textContent = "Signed out";
    $("status-pill").className = "pill pill-muted";
  }
}

$("sign-in-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("sign-in-error");
  errorEl.classList.add("hidden");
  errorEl.textContent = "";
  const btn = $("sign-in-btn");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  try {
    await signIn($("email").value.trim(), $("password").value);
    $("password").value = "";
    // Trigger an immediate sync so the popup reflects "auto-paused — day not started"
    // (or whatever the current state is) without waiting for the 30s alarm.
    await new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "FLUSH_NOW" }, () => resolve(null)),
    );
    await refresh();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

$("sign-out-btn").addEventListener("click", async () => {
  await clearSession();
  await refresh();
});

$("pause-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STATUS" }, (status) => {
    const next = status?.paused ? "RESUME" : "PAUSE";
    chrome.runtime.sendMessage({ type: next }, () => refresh());
  });
});

$("flush-btn").addEventListener("click", () => {
  $("flush-btn").disabled = true;
  chrome.runtime.sendMessage({ type: "FLUSH_NOW" }, () => {
    $("flush-btn").disabled = false;
    refresh();
  });
});

refresh();
