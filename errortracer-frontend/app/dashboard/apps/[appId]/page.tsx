"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFrameworkColor } from "@/lib/mock-data";
import { cn, formatCount } from "@/lib/utils";
import { AppOverviewTab } from "@/components/apps/overview-tab";
import { AppErrorsTab } from "@/components/apps/errors-tab";
import { AppIntegrationTab } from "@/components/apps/integration-tab";
import { AppTeamTab } from "@/components/apps/team-tab";
import { AppSettingsTab } from "@/components/apps/settings-tab";
import { apiFetch } from "@/lib/api-client";

interface ApiApplication {
  id: string;
  name: string;
  about: string | null;
  status: string;
  createdAt: string;
  membershipsCount?: number | string;
  errorsCount?: number | string;
  criticalCount?: number | string;
  framework?: {
    name?: string | null;
  } | null;
  environment?: {
    envName?: string | null;
    appKey?: string | null;
  } | null;
  membership?: {
    role?: string | null;
  } | null;
}

interface AppViewModel {
  id: string;
  name: string;
  framework: string;
  environment: string;
  description: string;
  errorsCount: number;
  criticalCount: number;
  status: string;
  key: string;
  productionMode: boolean;
  membershipRole: string | null;
}

interface ApiApplicationCredentials {
  appKey?: string | null;
  productionMode?: boolean | null;
  isEnabled?: boolean | null;
}

export default function AppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { appId } = use(params);
  const requestedTab = use(searchParams).tab;
  const selectedTab = getSelectedTab(requestedTab);
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [app, setApp] = useState<AppViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOwner = app?.membershipRole === "owner";
  const activeTab =
    selectedTab === "settings" && !isOwner ? "overview" : selectedTab;

  function handleTabChange(tab: string) {
    const nextTab = getSelectedTab(tab);
    const permittedTab =
      nextTab === "settings" && !isOwner ? "overview" : nextTab;

    if (
      permittedTab === activeTab &&
      currentSearchParams.get("tab") === permittedTab
    ) {
      return;
    }

    const params = new URLSearchParams(currentSearchParams.toString());
    params.set("tab", permittedTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }
  async function loadApp() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAppDetail(appId);

      setApp(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load application.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    fetchAppDetail(appId)
      .then((data) => {
        if (active) {
          setApp(data);
        }
      })
      .catch((error) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load application.",
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
  }, [appId]);

  useEffect(() => {
    if (!loading && app && selectedTab === "settings" && !isOwner) {
      const params = new URLSearchParams(currentSearchParams.toString());
      params.set("tab", "overview");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    app,
    currentSearchParams,
    isOwner,
    loading,
    pathname,
    router,
    selectedTab,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading app...
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card text-center">
        <p className="text-sm font-medium text-foreground">
          Could not load app
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error ?? "The application was not found."}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/apps">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={loadApp}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/apps"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3" />
          Back to apps
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">
                {app.name}
              </h1>
              <span
                className={cn(
                  "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  getFrameworkColor(app.framework),
                )}
              >
                {app.framework}
              </span>
              <span className="inline-flex rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {app.environment}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  getStatusColor(app.status),
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {app.status.toLowerCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{app.description}</p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-4 py-2">
            <div className="flex flex-col items-center">
              <span className="font-mono text-lg font-semibold text-foreground">
                {formatCount(app.errorsCount)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                total errors
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="font-mono text-lg font-semibold text-red-400">
                {formatCount(app.criticalCount)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                critical
              </span>
            </div>
          </div>
        </div>
      </div>

      {isOwner && !app.productionMode && (
        <Alert className="border-yellow-500/20 bg-yellow-500/5 text-yellow-500">
          <AlertTriangle className="size-4" />
          <AlertTitle>Production mode is off</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-yellow-500/90 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Turn on production mode when this app is ready to collect live
              errors.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-yellow-500/30 bg-transparent text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
              asChild
            >
              <Link href={`${pathname}?tab=settings`}>Open settings</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col gap-4"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="team">Team & Permissions</TabsTrigger>
          {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <AppOverviewTab app={app} />
        </TabsContent>
        <TabsContent value="errors">
          <AppErrorsTab appId={app.id} />
        </TabsContent>
        <TabsContent value="integration">
          <AppIntegrationTab
            appId={app.id}
            appKey={app.key}
            canManageApp={isOwner}
            onAppKeyChange={(appKey) =>
              setApp((currentApp) =>
                currentApp ? { ...currentApp, key: appKey } : currentApp,
              )
            }
          />
        </TabsContent>
        <TabsContent value="team">
          <AppTeamTab appId={app.id} canManageApp={isOwner} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="settings">
            <AppSettingsTab
              app={app}
              canManageApp={isOwner}
              onProductionModeChange={(productionMode) =>
                setApp((currentApp) =>
                  currentApp ? { ...currentApp, productionMode } : currentApp,
                )
              }
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

async function fetchAppDetail(appId: string) {
  const [app, credentials] = await Promise.all([
    apiFetch<ApiApplication>(`/v0.1/applications/${appId}`),
    apiFetch<ApiApplicationCredentials>(
      `/v0.1/applications/${appId}/credentials`,
    ).catch(() => null),
  ]);

  return toAppViewModel(app, credentials);
}

function toAppViewModel(
  app: ApiApplication,
  credentials: ApiApplicationCredentials | null,
): AppViewModel {
  return {
    id: app.id,
    name: app.name,
    framework: app.framework?.name ?? "Unknown",
    environment: app.environment?.envName ?? "unknown",
    description: app.about || "No description",
    errorsCount: Number(app.errorsCount ?? 0),
    criticalCount: Number(app.criticalCount ?? 0),
    status: app.status,
    key: credentials?.appKey ?? "",
    productionMode:
      credentials?.isEnabled ?? credentials?.productionMode ?? false,
    membershipRole: app.membership?.role ?? null,
  };
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "suspended":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";
    default:
      return "border-border bg-secondary/50 text-muted-foreground";
  }
}

function getSelectedTab(tab: string | undefined) {
  switch (tab) {
    case "errors":
    case "integration":
    case "team":
    case "settings":
      return tab;
    default:
      return "overview";
  }
}
