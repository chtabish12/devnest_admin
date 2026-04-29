import { createClient } from "@/lib/supabase/server";
import type { ProductivityCategory } from "@/lib/activity-categories";

export interface ActivitySession {
  id: string;
  employee_id: string;
  hostname: string;
  url: string | null;
  title: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  was_idle: boolean;
  category: ProductivityCategory | null;
  created_at: string;
}

export interface ActivityRollup {
  totalMs: number;
  productiveMs: number;
  neutralMs: number;
  distractingMs: number;
  idleMs: number;
  topSites: { hostname: string; ms: number; category: ProductivityCategory }[];
}

const EMPTY_ROLLUP: ActivityRollup = {
  totalMs: 0,
  productiveMs: 0,
  neutralMs: 0,
  distractingMs: 0,
  idleMs: 0,
  topSites: [],
};

export async function getActivitySessions(
  employeeId: string,
  start: Date,
  end: Date,
): Promise<ActivitySession[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("activity_sessions")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString())
    .order("started_at", { ascending: true });
  return (data as ActivitySession[]) ?? [];
}

export function rollupActivity(sessions: ActivitySession[]): ActivityRollup {
  if (sessions.length === 0) return EMPTY_ROLLUP;

  let totalMs = 0;
  let productiveMs = 0;
  let neutralMs = 0;
  let distractingMs = 0;
  let idleMs = 0;
  const byHost = new Map<string, { ms: number; category: ProductivityCategory }>();

  for (const s of sessions) {
    const ms = s.duration_ms ?? 0;
    totalMs += ms;
    if (s.was_idle) {
      idleMs += ms;
      continue;
    }
    const cat = (s.category ?? "neutral") as ProductivityCategory;
    if (cat === "productive") productiveMs += ms;
    else if (cat === "distracting") distractingMs += ms;
    else neutralMs += ms;

    const cur = byHost.get(s.hostname) ?? { ms: 0, category: cat };
    cur.ms += ms;
    byHost.set(s.hostname, cur);
  }

  const topSites = [...byHost.entries()]
    .map(([hostname, v]) => ({ hostname, ms: v.ms, category: v.category }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 10);

  return { totalMs, productiveMs, neutralMs, distractingMs, idleMs, topSites };
}
