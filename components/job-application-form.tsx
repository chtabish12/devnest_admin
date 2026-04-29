"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  jobApplicationSchema,
  type JobApplicationInput,
} from "@/lib/schemas/job-application";
import {
  createJobApplication,
  updateJobApplication,
} from "@/app/(employee)/dashboard/jobs/actions";

interface Props {
  mode: "create" | "edit";
  id?: string;
  defaults?: Partial<JobApplicationInput>;
}

export function JobApplicationForm({ mode, id, defaults }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<JobApplicationInput>({
    resolver: zodResolver(jobApplicationSchema),
    // Don't yell while typing — surface errors after the first submit attempt,
    // and re-validate on blur after that.
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      applied_date: defaults?.applied_date ?? today,
      company: defaults?.company ?? "",
      job_title: defaults?.job_title ?? "",
      status: defaults?.status ?? "applied",
      platform: defaults?.platform ?? "",
      country: defaults?.country ?? "",
      city: defaults?.city ?? "",
      job_nature: defaults?.job_nature ?? "",
      company_link: defaults?.company_link ?? "",
      job_link: defaults?.job_link ?? "",
      client_name: defaults?.client_name ?? "",
      position: defaults?.position ?? "",
      contact_email: defaults?.contact_email ?? "",
      interview_date: defaults?.interview_date ?? "",
      interview_time: defaults?.interview_time ?? "",
      feedback: defaults?.feedback ?? "",
      comments: defaults?.comments ?? "",
      follow_up_date: defaults?.follow_up_date ?? "",
    } as JobApplicationInput,
  });

  const onSubmit = (values: JobApplicationInput) => {
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createJobApplication(values)
          : await updateJobApplication(id!, values);
      if (res?.error) toast.error(res.error);
      else toast.success(mode === "create" ? "Application logged" : "Application updated");
    });
  };

  const onInvalid = () => {
    toast.error("Please fix the highlighted fields");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Application details</CardTitle>
          <CardDescription>
            Required fields are marked <span className="text-destructive">*</span>. Everything
            else is optional — fill what you know, come back later for the rest.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* --- Required (first 4) --- */}
          <Field
            label="Date applied"
            id="applied_date"
            required
            error={errors.applied_date?.message}
          >
            <Input
              id="applied_date"
              type="date"
              error={!!errors.applied_date}
              {...register("applied_date")}
            />
          </Field>

          <Field label="Company" id="company" required error={errors.company?.message}>
            <Input
              id="company"
              error={!!errors.company}
              placeholder="e.g. Google"
              {...register("company")}
            />
          </Field>

          <Field label="Job title" id="job_title" required error={errors.job_title?.message}>
            <Input
              id="job_title"
              error={!!errors.job_title}
              placeholder="e.g. Senior Software Engineer"
              {...register("job_title")}
            />
          </Field>

          <Field label="Status" id="status" required error={errors.status?.message}>
            <NativeSelect id="status" error={!!errors.status} {...register("status")}>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {JOB_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {/* --- Optional --- */}
          <Field label="Platform" id="platform" hint="e.g. LinkedIn, Indeed, Upwork">
            <Input id="platform" {...register("platform")} />
          </Field>

          <Field label="Job nature" id="job_nature" hint="Full-time, Contract, Remote, etc.">
            <Input id="job_nature" {...register("job_nature")} />
          </Field>

          <Field label="Country" id="country">
            <Input id="country" {...register("country")} />
          </Field>

          <Field label="City" id="city">
            <Input id="city" {...register("city")} />
          </Field>

          <Field label="Position" id="position">
            <Input id="position" {...register("position")} />
          </Field>

          <Field label="Client name" id="client_name">
            <Input id="client_name" {...register("client_name")} />
          </Field>

          <Field label="Company link" id="company_link" error={errors.company_link?.message}>
            <Input
              id="company_link"
              error={!!errors.company_link}
              placeholder="company.com — we'll add https:// for you"
              {...register("company_link")}
            />
          </Field>

          <Field label="Job link" id="job_link" error={errors.job_link?.message}>
            <Input
              id="job_link"
              error={!!errors.job_link}
              placeholder="link to the posting"
              {...register("job_link")}
            />
          </Field>

          <Field
            label="Contact email"
            id="contact_email"
            error={errors.contact_email?.message}
          >
            <Input
              id="contact_email"
              type="email"
              error={!!errors.contact_email}
              placeholder="recruiter@company.com"
              {...register("contact_email")}
            />
          </Field>

          <Field label="Follow-up date" id="follow_up_date" hint="When should you check back?">
            <Input id="follow_up_date" type="date" {...register("follow_up_date")} />
          </Field>

          <Field label="Interview date" id="interview_date">
            <Input id="interview_date" type="date" {...register("interview_date")} />
          </Field>

          <Field label="Interview time" id="interview_time">
            <Input id="interview_time" type="time" {...register("interview_time")} />
          </Field>

          <Field label="Feedback" id="feedback" full>
            <Textarea id="feedback" rows={3} {...register("feedback")} />
          </Field>

          <Field label="Comments" id="comments" full>
            <Textarea id="comments" rows={3} {...register("comments")} />
          </Field>
        </CardContent>
      </Card>

      {isSubmitted && Object.keys(errors).length > 0 ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Some fields need attention — see the highlighted boxes above.
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Saving…" : mode === "create" ? "Save application" : "Update application"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  full,
  required,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  full?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (full ? "md:col-span-2" : "")}>
      <Label htmlFor={id} className={error ? "text-destructive" : ""}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
