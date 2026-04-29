import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, ClipboardList, Home } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Briefcase className="h-5 w-5" /> DevNest
            </Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              <NavLink href="/dashboard" label="Today" icon={<Home className="h-4 w-4" />} />
              <NavLink href="/dashboard/jobs" label="Jobs" icon={<Briefcase className="h-4 w-4" />} />
              <NavLink
                href="/dashboard/report"
                label="Report"
                icon={<ClipboardList className="h-4 w-4" />}
              />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile.full_name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
