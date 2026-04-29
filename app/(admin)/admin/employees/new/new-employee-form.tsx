"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { newEmployeeSchema, type NewEmployeeInput } from "@/lib/schemas/auth";
import { createEmployee } from "@/app/(admin)/admin/employees/actions";

function suggestPassword() {
  return Array.from({ length: 14 }, () =>
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789".charAt(
      Math.floor(Math.random() * 54),
    ),
  ).join("");
}

export default function NewEmployeeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewEmployeeInput>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: { full_name: "", email: "", password: suggestPassword() },
  });

  const password = watch("password");

  const onSubmit = (values: NewEmployeeInput) => {
    startTransition(async () => {
      const res = await createEmployee(values);
      if (res?.error) toast.error(res.error);
      else toast.success(`Employee created — share the password with ${values.email}`);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New employee</CardTitle>
        <CardDescription>Required fields only — name, email, temp password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register("full_name")} />
            {errors.full_name ? (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Temporary password</Label>
            <div className="flex gap-2">
              <Input id="password" {...register("password")} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setValue("password", suggestPassword(), { shouldValidate: true })}
              >
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this with the employee. They can change it later.
            </p>
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <UserPlus className="h-4 w-4" />
              {pending ? "Creating…" : "Create employee"}
            </Button>
          </div>

          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Suggested password: <code className="font-mono">{password}</code>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
