import Link from "next/link";
import { Briefcase, UserCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { dayBounds } from "@/lib/time/aggregate";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const supabase = createClient();
  const { start, end } = dayBounds(new Date());
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [{ count: empCount }, { count: activeToday }, { count: jobsThisWeek }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "employee"),
    supabase
      .from("time_events")
      .select("employee_id", { count: "exact", head: true })
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString()),
    supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .gte("applied_date", sevenDaysAgo.toISOString().slice(0, 10)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">A quick look at the team.</p>
        </div>
        <Button asChild>
          <Link href="/admin/employees/new">+ Add employee</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total employees"
          value={empCount ?? 0}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Activity events today"
          value={activeToday ?? 0}
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Applications this week"
          value={jobsThisWeek ?? 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>Jump into the most common admin tasks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/employees">Manage employees</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/reports">View daily reports</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
