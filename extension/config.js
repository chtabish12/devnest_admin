// DevNest extension configuration.
// These values are baked into the extension at install time. The publishable
// key is anon-level (designed to be exposed to browsers) — RLS enforces that
// employees can only write their own activity rows.

export const SUPABASE_URL = "https://dikltyajnjnzfsjiauyr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_0v7glsZ57BCMfiaelP5htg_43byHW3X";

// Idle threshold (seconds without input before we mark sessions as idle).
export const IDLE_THRESHOLD_SECONDS = 60;

// How often the extension flushes queued sessions to Supabase.
export const FLUSH_INTERVAL_SECONDS = 30;

// Sessions shorter than this are dropped (avoids logging every brief tab flip).
export const MIN_SESSION_MS = 1_000;

// When true, every state-machine event is logged to the service-worker console.
// Open chrome://extensions → DevNest Activity → "Service worker" link to see them.
export const DEBUG = true;
