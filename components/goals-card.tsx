import { Target, TrendingUp, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeekProgress } from "@/lib/goals";

export function GoalsCard({ progress }: { progress: WeekProgress }) {
  const weeklyPct = Math.min(
    100,
    Math.round((progress.weeklyApplied / progress.weeklyGoal) * 100),
  );
  const dailyPct = Math.min(
    100,
    Math.round((progress.dailyApplied / progress.dailyGoalToday) * 100),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </CardTitle>
          <CardDescription>
            {progress.weeklyGoal} jobs / week · {progress.dailyGoalToday} target for today
            {progress.dailyGoalToday > 40
              ? " (bumped to make up earlier shortfall)"
              : null}
          </CardDescription>
        </div>
        {progress.onTrackForWeek ? (
          <Badge variant="success" className="shrink-0 gap-1">
            <TrendingUp className="h-3 w-3" /> On track
          </Badge>
        ) : (
          <Badge variant="warning" className="shrink-0 gap-1">
            <TrendingDown className="h-3 w-3" /> Behind pace
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <ProgressBar
          label="Today"
          applied={progress.dailyApplied}
          goal={progress.dailyGoalToday}
          pct={dailyPct}
          hint={
            progress.dailyApplied >= progress.dailyGoalToday
              ? "Daily goal hit — anything more is gravy."
              : `${progress.dailyGoalToday - progress.dailyApplied} more to hit today's target`
          }
          highlight={progress.dailyApplied >= progress.dailyGoalToday}
        />
        <ProgressBar
          label="This week"
          applied={progress.weeklyApplied}
          goal={progress.weeklyGoal}
          pct={weeklyPct}
          hint={
            progress.weeklyRemaining === 0
              ? `Weekly goal hit. ${progress.weeklyApplied - progress.weeklyGoal} over.`
              : `${progress.weeklyRemaining} more to hit ${progress.weeklyGoal} this week (${progress.workingDaysRemainingIncludingToday} working day${progress.workingDaysRemainingIncludingToday === 1 ? "" : "s"} left)`
          }
          highlight={progress.weeklyApplied >= progress.weeklyGoal}
        />
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  label,
  applied,
  goal,
  pct,
  hint,
  highlight,
}: {
  label: string;
  applied: number;
  goal: number;
  pct: number;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={
            "font-mono text-sm tabular-nums " + (highlight ? "text-emerald-600" : "")
          }
        >
          {applied} / {goal}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={
            "h-full transition-all " +
            (highlight ? "bg-emerald-500" : "bg-primary")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
