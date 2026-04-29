"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newEmployeeSchema } from "@/lib/schemas/auth";

async function checkAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") return { ok: false, error: "Admin access required" };
  return { ok: true };
}

export async function createEmployee(input: unknown) {
  const guard = await checkAdmin();
  if (!guard.ok) return { error: guard.error };

  const parsed = newEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const { full_name, email, password } = parsed.data;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "employee" },
    });
    if (error || !data.user) return { error: error?.message ?? "Could not create employee" };

    const { error: upsertError } = await admin
      .from("profiles")
      .upsert({ id: data.user.id, email, full_name, role: "employee", is_active: true });
    if (upsertError) {
      return { error: `User created but profile sync failed: ${upsertError.message}` };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected error creating employee" };
  }

  redirect("/admin/employees");
}

export async function setEmployeeActive(employeeId: string, isActive: boolean) {
  const guard = await checkAdmin();
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", employeeId);
    if (error) return { error: error.message };
    revalidatePath("/admin/employees");
    return { ok: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
