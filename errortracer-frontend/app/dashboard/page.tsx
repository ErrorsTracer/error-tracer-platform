"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  AppWindow,
  Bug,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ErrorTrendChart } from "@/components/dashboard/error-trend-chart";
import { SeverityDistribution } from "@/components/dashboard/severity-distribution";
import { RecentErrorsTable } from "@/components/dashboard/recent-errors-table";
import { RecentApps } from "@/components/dashboard/recent-apps";
import { CreateAppModal } from "@/components/dashboard/create-app-modal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

interface UserUsage {
  totalErrorBytes: number;
}

interface DashboardStats {
  totalApps: number;
  sharedApps: number;
  errorsThisWeek: number;
  errorChangePercent: number;
  criticalErrors: number;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monitor error activity across all applications.
        </p>
      </div>

      <div className="relative flex flex-col gap-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardStatsCards />
          <TotalApplicationUsageCard />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ErrorTrendChart />
          </div>
          <SeverityDistribution />
        </div>

        {/* Recent Apps */}
        <RecentApps />

        {/* Recent Errors Table */}
        <RecentErrorsTable />

        <EmptyApplicationsOverlay />
      </div>
    </div>
  );
}

function EmptyApplicationsOverlay() {
  const [appsCount, setAppsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function loadApplicationsCount(shouldUpdate = () => true) {
    setLoading(true);

    try {
      const data = await apiFetch<unknown[]>("/v0.1/applications/");

      if (shouldUpdate()) {
        setAppsCount(data.length);
      }
    } catch {
      if (shouldUpdate()) {
        setAppsCount(null);
      }
    } finally {
      if (shouldUpdate()) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    loadApplicationsCount(() => active);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleAppsChanged() {
      loadApplicationsCount();
    }

    window.addEventListener("errortracer:apps-changed", handleAppsChanged);

    return () => {
      window.removeEventListener("errortracer:apps-changed", handleAppsChanged);
    };
  }, []);

  if (loading || appsCount !== 0) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 z-10 flex min-h-[520px] items-center justify-center rounded-lg bg-background/75 px-4 backdrop-blur-[2px]">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-border bg-card/95 p-5 text-center shadow-xl shadow-background/20">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <AppWindow className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Create your first application
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an app to start collecting and reviewing error activity.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-1"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            Create App
          </Button>
        </div>
      </div>

      <CreateAppModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function DashboardStatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    apiFetch<DashboardStats>("/v0.1/users/dashboard/stats")
      .then((data) => {
        if (active) {
          setStats(data);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading || error || !stats) {
    const description = loading ? "Loading statistics..." : "Unavailable";

    return (
      <>
        <StatCard
          title="Total Apps"
          value="-"
          icon={AppWindow}
          description={description}
        />
        <StatCard
          title="Errors This Week"
          value="-"
          icon={Bug}
          description={description}
        />
        <StatCard
          title="Critical Errors"
          value="-"
          icon={AlertTriangle}
          description={description}
        />
      </>
    );
  }

  const change = stats.errorChangePercent;
  const changePrefix = change > 0 ? "+" : "";
  const changeType =
    change > 0 ? "negative" : change < 0 ? "positive" : "neutral";

  return (
    <>
      <StatCard
        title="Total Apps"
        value={stats.totalApps}
        icon={AppWindow}
        description={`${stats.sharedApps} shared applications`}
      />
      <StatCard
        title="Errors This Week"
        value={stats.errorsThisWeek}
        change={`${changePrefix}${change}%`}
        changeType={changeType}
        icon={Bug}
        description="vs. last week"
      />
      <StatCard
        title="Critical Errors"
        value={stats.criticalErrors}
        icon={AlertTriangle}
        description="Require immediate attention"
      />
    </>
  );
}

function TotalApplicationUsageCard() {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadUsage(shouldUpdate = () => true) {
    setLoading(true);
    setError(false);

    try {
      const data = await apiFetch<UserUsage>("/v0.1/users/usage");

      if (shouldUpdate()) {
        setUsage(data);
      }
    } catch {
      if (shouldUpdate()) {
        setError(true);
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
  }, []);

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
