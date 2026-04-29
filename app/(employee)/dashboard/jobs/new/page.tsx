import { JobApplicationForm } from "@/components/job-application-form";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log a job application</h1>
        <p className="text-sm text-muted-foreground">
          Fill what you know. You can come back and update it later.
        </p>
      </div>
      <JobApplicationForm mode="create" />
    </div>
  );
}
