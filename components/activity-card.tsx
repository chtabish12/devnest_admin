import { Activity, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/time/aggregate";
import {
  CATEGORY_BADGE_VARIANTS,
  CATEGORY_LABELS,
  type ProductivityCategory,
} from "@/lib/activity-categories";
import type { ActivityRollup } from "@/lib/data/activity-queries";

export function ActivityCard({
  rollup,
  installed,
}: {
  rollup: ActivityRollup;
  installed: boolean;
}) {
  const trackedMs = rollup.productiveMs + rollup.neutralMs + rollup.distractingMs;
  const productivePct =
    trackedMs === 0 ? 0 : Math.round((rollup.productiveMs / trackedMs) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Browser activity
        </CardTitle>
        <CardDescription>
          {installed
            ? "From the DevNest Activity Chrome extension. Idle time excluded."
            : "Install the DevNest Activity Chrome extension to populate this section."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat
            label="Productive"
            value={formatDuration(rollup.productiveMs)}
            sub={trackedMs > 0 ? `${productivePct}% of tracked` : "—"}
            tone="success"
          />
          <Stat
            label="Neutral"
            value={formatDuration(rollup.neutralMs)}
            sub="other sites"
            tone="muted"
          />
          <Stat
            label="Distracting"
            value={formatDuration(rollup.distractingMs)}
            sub="social, news, shopping…"
            tone="destructive"
          />
          <Stat
            label="Idle"
            value={formatDuration(rollup.idleMs)}
            sub="no input detected"
            tone="muted"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4" />
            Top sites
          </div>
          {rollup.topSites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {rollup.topSites.map((s) => (
                <li
                  key={s.hostname}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant={CATEGORY_BADGE_VARIANTS[s.category]} className="shrink-0">
                      {CATEGORY_LABELS[s.category]}
                    </Badge>
                    <span className="truncate font-mono text-xs">{s.hostname}</span>
                  </div>
                  <span className="shrink-0 font-mono tabular-nums text-xs">
                    {formatDuration(s.ms)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "success" | "destructive" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-emerald-600"
      : tone === "destructive"
        ? "text-destructive"
        : "";
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={"mt-1 font-mono text-lg tabular-nums " + color}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
