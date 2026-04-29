"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Dashboard couldn't load
        </CardTitle>
        <CardDescription>
          {process.env.NODE_ENV === "development"
            ? error.message
            : "We couldn't fetch your data. This is usually transient."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={() => reset()}>
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
      </CardContent>
    </Card>
  );
}
