import { notFound } from "next/navigation";

import { JobApplicationForm } from "@/components/job-application-form";
import { createClient } from "@/lib/supabase/server";
import type { JobApplication } from "@/lib/types/database";
import type { JobApplicationInput } from "@/lib/schemas/job-application";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();

  const job = data as JobApplication;
  const defaults: Partial<JobApplicationInput> = {
    applied_date: job.applied_date,
    platform: job.platform ?? "",
    country: job.country ?? "",
    city: job.city ?? "",
    company: job.company ?? "",
    job_nature: job.job_nature ?? "",
    company_link: job.company_link ?? "",
    job_title: job.job_title ?? "",
    job_link: job.job_link ?? "",
    client_name: job.client_name ?? "",
    position: job.position ?? "",
    contact_email: job.contact_email ?? "",
    status: job.status,
    interview_date: job.interview_date ?? "",
    interview_time: job.interview_time ?? "",
    feedback: job.feedback ?? "",
    comments: job.comments ?? "",
    follow_up_date: job.follow_up_date ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit application</h1>
        <p className="text-sm text-muted-foreground">
          {job.company ? `${job.company} — ` : ""}
          {job.job_title ?? "Untitled"}
        </p>
      </div>
      <JobApplicationForm mode="edit" id={job.id} defaults={defaults} />
    </div>
  );
}
