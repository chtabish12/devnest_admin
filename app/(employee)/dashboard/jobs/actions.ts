"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jobApplicationSchema } from "@/lib/schemas/job-application";

export async function createJobApplication(formData: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = jobApplicationSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { error } = await supabase
    .from("job_applications")
    .insert({ ...parsed.data, employee_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  redirect("/dashboard/jobs");
}

export async function updateJobApplication(id: string, formData: unknown) {
  const supabase = createClient();
  const parsed = jobApplicationSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { error } = await supabase.from("job_applications").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  redirect("/dashboard/jobs");
}

export async function deleteJobApplication(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("job_applications").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/jobs");
  return { ok: true as const };
}
