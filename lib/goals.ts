// Devnest job-application targets.
// Daily floor: 40. Weekly target: 200. Mon-Fri working week (5 days).
//
// Carryover logic: if you applied to fewer than the per-day target on a given day,
// the deficit redistributes across the remaining working days in the week so the
// weekly total stays achievable.

export const DAILY_GOAL = 40;
export const WEEKLY_GOAL = 200;
export const WORKING_DAYS_PER_WEEK = 5; // Mon-Fri

export interface WeekProgress {
  weeklyGoal: number;
  weeklyApplied: number;
  weeklyRemaining: number;
  dailyApplied: number;
  dailyGoalToday: number; // adjusted for any carryover
  daysWorkedSoFar: number;
  workingDaysRemainingIncludingToday: number;
  onTrackForWeek: boolean;
  isWorkingDayToday: boolean;
}

// Returns the Monday (00:00 local) of the week containing `date`.
export function startOfWorkWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

// `dailyCounts` is a map keyed by ISO date (YYYY-MM-DD) → number of jobs applied that day.
// We pass in counts rather than querying inside this function so it stays pure/testable.
export function computeWeekProgress(
  dailyCounts: Map<string, number>,
  now: Date = new Date(),
): WeekProgress {
  const weekStart = startOfWorkWeek(now);
  const isWorkingToday = isWorkingDay(now);

  // Count applied so far (Mon → today inclusive)
  let weeklyApplied = 0;
  let daysWorkedSoFar = 0;
  let dailyApplied = 0;

  const todayIso = now.toISOString().slice(0, 10);

  for (let i = 0; i < WORKING_DAYS_PER_WEEK; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    if (day > now) break;
    const iso = day.toISOString().slice(0, 10);
    const count = dailyCounts.get(iso) ?? 0;
    weeklyApplied += count;
    daysWorkedSoFar += 1;
    if (iso === todayIso) dailyApplied = count;
  }

  const weeklyRemaining = Math.max(0, WEEKLY_GOAL - weeklyApplied);

  // How many working days are left in this week, INCLUDING today if today is a working day?
  const daysCompleted = isWorkingToday ? daysWorkedSoFar - 1 : daysWorkedSoFar;
  const workingDaysRemainingIncludingToday = Math.max(
    0,
    WORKING_DAYS_PER_WEEK - daysCompleted,
  );

  // Today's adjusted target = daily floor, OR remaining-spread-across-remaining-days,
  // whichever is higher (so a behind-pace day pushes the floor up).
  let dailyGoalToday = DAILY_GOAL;
  if (workingDaysRemainingIncludingToday > 0) {
    const requiredPerDay = Math.ceil(weeklyRemaining / workingDaysRemainingIncludingToday);
    dailyGoalToday = Math.max(DAILY_GOAL, requiredPerDay);
  }

  // On track for the week if pace through completed days plus expected today's work
  // can reach 200.
  const projected =
    weeklyApplied +
    Math.max(0, workingDaysRemainingIncludingToday - (isWorkingToday ? 1 : 0)) * DAILY_GOAL +
    (isWorkingToday ? Math.max(dailyApplied, DAILY_GOAL) : 0);
  const onTrackForWeek = projected >= WEEKLY_GOAL;

  return {
    weeklyGoal: WEEKLY_GOAL,
    weeklyApplied,
    weeklyRemaining,
    dailyApplied,
    dailyGoalToday,
    daysWorkedSoFar,
    workingDaysRemainingIncludingToday,
    onTrackForWeek,
    isWorkingDayToday: isWorkingToday,
  };
}
