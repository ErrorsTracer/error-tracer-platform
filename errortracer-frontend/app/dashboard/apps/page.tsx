"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  AppWindow,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime, getFrameworkColor } from "@/lib/mock-data";
import { cn, formatCount } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

interface ApiApplication {
  id: string;
  name: string;
  about: string | null;
  status: string;
  createdAt: string;
  membershipsCount?: number | string;
  totalErrors?: number | string;
  criticalErrors?: number | string;
  framework?: {
    name?: string | null;
  } | null;
  environment?: {
    envName?: string | null;
  } | null;
}

interface Framework {
  id: string;
  name: string;
}

export default function AppsPage() {
  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameworksLoading, setFrameworksLoading] = useState(true);
  const [frameworksError, setFrameworksError] = useState<string | null>(null);

  async function loadApps() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ApiApplication[]>("/v0.1/applications/");
      setApps(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load applications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    apiFetch<ApiApplication[]>("/v0.1/applications/")
      .then((data) => {
        if (active) {
          setApps(data);
        }
      })
      .catch((error) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load applications.",
          );
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

  useEffect(() => {
    let active = true;

    setFrameworksLoading(true);
    setFrameworksError(null);

    apiFetch<Framework[]>("/v0.1/applications/frameworks")
      .then((data) => {
        if (active) {
          setFrameworks(data);
        }
      })
      .catch((error) => {
        if (active) {
          setFrameworksError(
            error instanceof Error
              ? error.message
              : "Unable to load frameworks.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setFrameworksLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.addEventListener("errortracer:apps-changed", loadApps);

    return () => {
      window.removeEventListener("errortracer:apps-changed", loadApps);
    };
  }, []);

  const filteredApps = apps.filter((app) => {
    const frameworkName = app.framework?.name ?? "Unknown";
    const envName = app.environment?.envName ?? "unknown";
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase());
    const matchFramework =
      framework === "all" || frameworkName.toLowerCase() === framework;
    const matchEnv =
      environment === "all" || envName.toLowerCase() === environment;
    return matchSearch && matchFramework && matchEnv;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Apps</h1>
        <p className="text-sm text-muted-foreground">
          Manage your registered applications.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={framework}
          onValueChange={setFramework}
          disabled={frameworksLoading}
        >
          <SelectTrigger className="w-36">
            <SelectValue
              placeholder={frameworksLoading ? "Loading..." : "Framework"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworks.map((fw) => (
              <SelectItem key={fw.id} value={fw.name.toLowerCase()}>
                {fw.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={environment} onValueChange={setEnvironment}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Envs</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {frameworksError && (
        <p className="text-xs text-muted-foreground">
          Framework filters could not be loaded: {frameworksError}
        </p>
      )}

      {/* Apps Grid */}
      {loading && (
        <div className="flex min-h-64 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading apps...
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card text-center">
          <p className="text-sm font-medium text-foreground">
            Could not load apps
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={loadApps}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && filteredApps.length === 0 && (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-border bg-card text-center">
          <AppWindow className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No apps found</p>
          <p className="text-sm text-muted-foreground">
            {apps.length === 0
              ? "Create an app to start tracing errors."
              : "Try adjusting your filters."}
          </p>
        </div>
      )}

      {!loading && !error && filteredApps.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({ app }: { app: ApiApplication }) {
  const frameworkName = app.framework?.name ?? "Unknown";
  const environmentName = app.environment?.envName ?? "unknown";
  const totalErrors = Number(app.totalErrors ?? 0);
  const criticalErrors = Number(app.criticalErrors ?? 0);

  return (
    <Link
      href={`/dashboard/apps/${app.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-card/80"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/50">
            <AppWindow className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary">
              {app.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {app.about || "No description"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
            getFrameworkColor(frameworkName),
          )}
        >
          {frameworkName}
        </span>
        <span className="inline-flex rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {environmentName}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          {app.status.toLowerCase()}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatCount(totalErrors)}
            </span>
            <span className="text-[10px] text-muted-foreground">errors</span>
          </div>

          <div className="flex flex-col">
            <span className="flex items-center gap-1 font-mono text-sm font-semibold text-red-400">
              <AlertTriangle className="size-3" />
              {formatCount(criticalErrors)}
            </span>
            <span className="text-[10px] text-muted-foreground">critical</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(app.createdAt)}
        </span>
      </div>
    </Link>
  );
}
