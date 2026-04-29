"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/reports";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "biweek", label: "Bi-week" },
  { key: "month", label: "Month" },
];

export function PeriodTabs({ active }: { active: Period }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
      {PERIODS.map((p) => {
        const params = new URLSearchParams(searchParams);
        params.set("period", p.key);
        const href = `${pathname}?${params.toString()}`;
        return (
          <Link
            key={p.key}
            href={href}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition-colors",
              active === p.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
