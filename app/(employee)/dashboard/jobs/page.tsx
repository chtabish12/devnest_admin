import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobApplicationsTable } from "@/components/job-applications-table";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/queries";
import type { JobApplication } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("job_applications")
    .select("*")
    .eq("employee_id", profile.id)
    .order("applied_date", { ascending: false })
    .order("created_at", { ascending: false });

  const jobs = (data as JobApplication[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>
          <p className="text-sm text-muted-foreground">All the jobs you've logged.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">
            <Plus className="h-4 w-4" /> New application
          </Link>
        </Button>
      </div>
      <JobApplicationsTable jobs={jobs} emptyMessage="No applications yet — log your first one." />
    </div>
  );
}
