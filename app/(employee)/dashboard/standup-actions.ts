"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StandupSlot } from "@/lib/standups";

export async function markStandupAttended(slot: StandupSlot) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("standup_attendances").upsert(
    {
      employee_id: user.id,
      standup_date: today,
      slot,
    },
    { onConflict: "employee_id,standup_date,slot" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/report");
  return { ok: true as const };
}
