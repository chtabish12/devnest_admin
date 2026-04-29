"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function takeLeaveToday(reason?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Block if there's already activity today (login event recorded) — leaves
  // and worked days shouldn't coexist on the same date.
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const { count } = await supabase
    .from("time_events")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", user.id)
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString());
  if ((count ?? 0) > 0) {
    return { error: "You've already started your day — can't mark today as leave." };
  }

  const iso = today.toISOString().slice(0, 10);
  const { error } = await supabase.from("leaves").insert({
    employee_id: user.id,
    leave_date: iso,
    reason: reason && reason.trim().length > 0 ? reason.trim() : null,
  });
  if (error) {
    if (error.message.includes("Monthly leave limit")) {
      return { error: "You've already used both leaves this month." };
    }
    if (error.code === "23505") {
      return { error: "You're already marked off for today." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/report");
  return { ok: true as const };
}

export async function cancelTodayLeave() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const iso = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("leaves")
    .delete()
    .eq("employee_id", user.id)
    .eq("leave_date", iso);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/report");
  return { ok: true as const };
}
