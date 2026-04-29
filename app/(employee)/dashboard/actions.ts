"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types/database";

const ALLOWED: EventType[] = ["login", "break_start", "break_end", "logout"];

export async function recordTimeEvent(eventType: EventType) {
  if (!ALLOWED.includes(eventType)) {
    return { error: "Invalid event type" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("time_events")
    .insert({ employee_id: user.id, event_type: eventType });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/report");

  if (eventType === "logout") {
    redirect("/dashboard/report");
  }

  return { ok: true as const };
}
