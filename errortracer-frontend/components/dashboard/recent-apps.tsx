"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime, getFrameworkColor } from "@/lib/mock-data";
import { cn, formatCount } from "@/lib/utils";

interface ApiApplication {
  id: string;
  name: string;
  createdAt: string;
  totalErrors?: number | string;
  criticalErrors?: number | string;
  framework?: {
    name?: string | null;
  } | null;
}

export function RecentApps() {
  const [apps, setApps] = useState<ApiApplication[]>([]);

  useEffect(() => {
    let active = true;

    apiFetch<ApiApplication[]>("/v0.1/applications/")
      .then((data) => {
        if (active) {
          setApps(data);
        }
      })
      .catch(() => {
        if (active) {
          setApps([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (apps.length < 2) {
    return null;
  }

  const recentApps = [...apps]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Recent Applications
          </h3>
          <p className="text-xs text-muted-foreground">
            Most recently created apps
          </p>
        </div>
        <Link
          href="/dashboard/apps"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          View all
          <ExternalLink className="size-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {recentApps.map((app) => {
          const frameworkName = app.framework?.name ?? "Unknown";
          const totalErrors = Number(app.totalErrors ?? 0);
          const criticalErrors = Number(app.criticalErrors ?? 0);

          return (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="flex flex-col gap-2 rounded-md border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {app.name}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                    getFrameworkColor(frameworkName),
                  )}
                >
                  {frameworkName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">
                  {formatCount(totalErrors)} errors
                </span>
                {criticalErrors > 0 && (
                  <span className="font-mono text-red-400">
                    {formatCount(criticalErrors)} critical
                  </span>
                )}
                <span className="ml-auto">
                  {formatRelativeTime(app.createdAt)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
