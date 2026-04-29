"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newEmployeeSchema } from "@/lib/schemas/auth";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") throw new Error("Forbidden");
}

export async function createEmployee(input: unknown) {
  await assertAdmin();
  const parsed = newEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const { full_name, email, password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "employee" },
  });
  if (error || !data.user) return { error: error?.message ?? "Could not create employee" };

  // The handle_new_user trigger inserts the profile row. Belt-and-braces upsert:
  await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name, role: "employee", is_active: true });

  revalidatePath("/admin");
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function setEmployeeActive(employeeId: string, isActive: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", employeeId);
  if (error) return { error: error.message };
  revalidatePath("/admin/employees");
  return { ok: true as const };
}
