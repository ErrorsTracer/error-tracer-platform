"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  HardDrive,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ErrorTrendChart } from "@/components/dashboard/error-trend-chart";
import { RecentErrorsTable } from "@/components/dashboard/recent-errors-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  type ApplicationTopAffectedRoute,
  fetchApplicationTopAffectedRoutes,
} from "@/lib/application-errors";
import { apiFetch } from "@/lib/api-client";
import { formatCount } from "@/lib/utils";

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

interface AppOverviewTabProps {
  app: {
    id: string;
    name: string;
    errorsCount: number;
    criticalCount: number;
  };
}

interface ApplicationUsage {
  totalErrorBytes: number;
  ingestedErrors: number;
}

export function AppOverviewTab({ app }: AppOverviewTabProps) {
  const resolved = Math.floor(app.errorsCount * 0.35);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Errors" value={app.errorsCount} icon={Bug} />
        <StatCard
          title="Critical"
          value={app.criticalCount}
          icon={AlertTriangle}
        />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle2} />
        <ApplicationUsageCard appId={app.id} />
      </div>

      <ErrorTrendChart appId={app.id} />

      <TopAffectedRoutes appId={app.id} />

      <RecentErrorsTable appId={app.id} limit={4} />
    </div>
  );
}

function TopAffectedRoutes({ appId }: { appId: string }) {
  const [routes, setRoutes] = useState<ApplicationTopAffectedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRoutes(shouldUpdate = () => true) {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApplicationTopAffectedRoutes(appId);

      if (shouldUpdate()) {
        setRoutes(data);
      }
    } catch (error) {
      if (shouldUpdate()) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load affected routes.",
        );
      }
    } finally {
      if (shouldUpdate()) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    loadRoutes(() => active);

    return () => {
      active = false;
    };
  }, [appId]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">
        Top Affected Routes
      </h3>
      {loading ? (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-3.5 animate-spin" />
          Loading affected routes...
        </div>
      ) : error ? (
        <div className="flex h-24 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadRoutes()}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      ) : routes.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          No affected routes found.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {routes.map((route) => (
            <div key={route.route} className="flex items-center gap-3">
              <code className="w-48 shrink-0 truncate font-mono text-xs text-foreground">
                {route.route}
              </code>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-secondary">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${route.percentage}%` }}
                  />
                </div>
              </div>
              <span className="w-16 text-right font-mono text-xs text-muted-foreground">
                {formatCount(route.errors)} errors
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationUsageCard({ appId }: { appId: string }) {
  const [usage, setUsage] = useState<ApplicationUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsage(shouldUpdate = () => true) {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ApplicationUsage>(
        `/v0.1/applications/${encodeURIComponent(appId)}/usage`,
      );

      if (shouldUpdate()) {
        setUsage(data);
      }
    } catch (error) {
      if (shouldUpdate()) {
        setError(
          error instanceof Error ? error.message : "Unable to load usage.",
        );
      }
    } finally {
      if (shouldUpdate()) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    loadUsage(() => active);

    return () => {
      active = false;
    };
  }, [appId]);

  const usedBytes = usage?.totalErrorBytes ?? 0;
  const usedPercent = Math.min(
    100,
    Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100),
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Storage Usage
        </p>
        <HardDrive className="size-4 text-muted-foreground/60" />
      </div>
      {loading ? (
        <div className="mt-5 flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-3.5 animate-spin" />
          Loading usage...
        </div>
      ) : error ? (
        <div className="mt-3 flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Unavailable</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Retry storage usage"
            onClick={() => loadUsage()}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-2 font-mono text-lg font-semibold text-foreground">
            {formatStorage(usedBytes)}{" "}
            <span className="text-sm text-muted-foreground">/ 5 GB</span>
          </p>
          <Progress value={usedPercent} className="mt-2 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {usedPercent}% used
          </p>
        </>
      )}
    </div>
  );
}

function formatStorage(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = "B";

  for (const nextUnit of units) {
    value /= 1024;
    unit = nextUnit;

    if (value < 1024 || nextUnit === "GB") {
      break;
    }
  }

  const precision = value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${unit}`;
}
