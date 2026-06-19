"use client";

import { type ReactNode, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Globe,
  Loader2,
  RefreshCw,
  Tag,
  Terminal,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  formatRelativeTime,
  getFrameworkColor,
  getSeverityBg,
  getStatusBg,
} from "@/lib/mock-data";
import {
  type ApplicationError,
  fetchApplicationErrorDetails,
} from "@/lib/application-errors";
import { cn, formatCount } from "@/lib/utils";
import { toast } from "sonner";

export default function ErrorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ errorId: string }>;
  searchParams: Promise<{ appId?: string }>;
}) {
  const { errorId } = use(params);
  const { appId } = use(searchParams);
  const [error, setError] = useState<ApplicationError | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedStack, setCopiedStack] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });
  const [status, setStatus] = useState("unresolved");

  async function loadErrorDetails(shouldUpdate = () => true) {
    if (!appId) {
      setError(null);
      setLoadError("Application id is required to load this error.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const data = await fetchApplicationErrorDetails({ appId, errorId });

      if (shouldUpdate()) {
        setError(data);
        setStatus(getErrorStatus(data));
      }
    } catch (error) {
      if (shouldUpdate()) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load error.",
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

    loadErrorDetails(() => active);

    return () => {
      active = false;
    };
  }, [appId, errorId]);

  function copyToClipboard(text: string, type: "id" | "stack") {
    navigator.clipboard.writeText(text);

    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedStack(true);
      setTimeout(() => setCopiedStack(false), 2000);
    }

    toast.success(`${type === "id" ? "Event ID" : "Stack trace"} copied`);
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading error...
      </div>
    );
  }

  if (loadError || !error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card text-center">
        <p className="text-sm font-medium text-foreground">
          Could not load error
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {loadError ?? "The error was not found."}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/apps">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadErrorDetails()}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const stack = error.stack || error.error;
  const stackFrames = stack.split("\n").map((line) => line.trim());
  const breadcrumbs = getBreadcrumbs(error);
  const tags = getRecordEntries(error.tags);
  const requestContext = getContextEntries(error.request, {
    URL: error.url ?? error.href,
    Host: error.host,
    Transaction: error.transaction,
    "Client agent": error.clientAgent,
    "Client platform": error.clientPlatform,
  });
  const userContext = getContextEntries(error.user);
  const extraEntries = getContextEntries(error.extra);
  const firstSeen = error.createdAt ?? error.timestamp;
  const lastSeen = error.timestamp ?? error.createdAt;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/apps"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3" />
        Back to errors
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
                  getSeverityBg(error.level),
                )}
              >
                {error.level}
              </span>
              <span
                className={cn(
                  "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  getFrameworkColor(error.framework),
                )}
              >
                {error.framework}
              </span>
              <MetadataBadge value={error.environment} />
              <MetadataBadge value={error.runtime} />
              <MetadataBadge value={error.language} />
            </div>
            <h1 className="break-all font-mono text-lg font-semibold leading-tight text-foreground">
              {error.error}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{error.client ?? "Unknown client"}</span>
              <span className="text-border">|</span>
              <span>First seen {formatRelativeTime(firstSeen)}</span>
              <span className="text-border">|</span>
              <span>Last seen {formatRelativeTime(lastSeen)}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextStatus =
                status === "resolved" ? "unresolved" : "resolved";
              setStatus(nextStatus);
              toast.success(
                nextStatus === "resolved"
                  ? "Marked as resolved"
                  : "Marked as unresolved",
              );
            }}
          >
            {status === "resolved" ? (
              <Activity className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {status === "resolved" ? "Unresolve" : "Resolve"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-secondary/30 px-4 py-2.5">
          <div className="flex flex-col">
            <span className="font-mono text-lg font-semibold text-foreground">
              {formatCount(error.repeated)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              occurrences
            </span>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex flex-col">
            <span
              className={cn(
                "inline-flex w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                getStatusBg(status),
              )}
            >
              {status}
            </span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              status
            </span>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs text-muted-foreground">
              {error.id}
            </code>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => copyToClipboard(error.id, "id")}
              className="size-6"
            >
              {copiedId ? (
                <Check className="size-3 text-emerald-400" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">
                  Stack Trace
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(stack, "stack")}
              >
                {copiedStack ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span className="text-xs">Copy</span>
              </Button>
            </div>
            <div className="flex flex-col">
              {stackFrames.map((frame, i) => {
                const isExpandable = i > 0;
                const isExpanded = expanded[i];
                const isAppCode = isApplicationFrame(frame);

                return (
                  <div
                    key={`${frame}-${i}`}
                    className={cn(
                      "border-b border-border last:border-0",
                      isAppCode && "bg-primary/5",
                    )}
                  >
                    <button
                      onClick={() =>
                        isExpandable &&
                        setExpanded({ ...expanded, [i]: !isExpanded })
                      }
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-secondary/30"
                    >
                      {isExpandable ? (
                        isExpanded ? (
                          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        )
                      ) : (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
                      )}
                      <code
                        className={cn(
                          "break-all font-mono text-xs leading-relaxed",
                          i === 0
                            ? "font-medium text-red-400"
                            : isAppCode
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {frame}
                      </code>
                      {isAppCode && (
                        <span className="ml-auto shrink-0 rounded border border-primary/20 bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                          APP
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-foreground">
              Breadcrumb Timeline
            </h3>
            {breadcrumbs.length > 0 ? (
              <div className="flex flex-col gap-0">
                {breadcrumbs.map((breadcrumb, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "mt-1.5 size-2 rounded-full",
                          breadcrumb.type === "error"
                            ? "bg-red-400"
                            : breadcrumb.type === "http"
                              ? "bg-blue-400"
                              : "bg-muted-foreground",
                        )}
                      />
                      {i < breadcrumbs.length - 1 && (
                        <div className="min-h-4 flex-1 bg-border w-px" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                          {breadcrumb.type}
                        </span>
                        {breadcrumb.time && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {breadcrumb.time}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "font-mono text-xs",
                          breadcrumb.type === "error"
                            ? "text-red-400"
                            : "text-foreground",
                        )}
                      >
                        {breadcrumb.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No breadcrumbs captured for this error.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <MetadataPanel
            icon={<Tag className="size-3.5" />}
            title="Tags & Metadata"
            entries={tags}
            empty="No tags captured."
          />
          <MetadataPanel
            icon={<Globe className="size-3.5" />}
            title="Request Context"
            entries={requestContext}
            empty="No request context captured."
          />
          <MetadataPanel
            icon={<User className="size-3.5" />}
            title="User Context"
            entries={userContext}
            empty="No user context captured."
          />
          <MetadataPanel
            icon={<Clock className="size-3.5" />}
            title="Extra Data"
            entries={extraEntries}
            empty="No extra data captured."
          />
        </div>
      </div>
    </div>
  );
}

function MetadataBadge({ value }: { value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <span className="inline-flex rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {value}
    </span>
  );
}

function MetadataPanel({
  icon,
  title,
  entries,
  empty,
}: {
  icon: ReactNode;
  title: string;
  entries: [string, string][];
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon} {title}
      </h3>
      {entries.length > 0 ? (
        <div className="flex flex-col gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{key}</span>
              <code className="max-w-48 truncate rounded bg-secondary/50 px-1.5 py-0.5 font-mono text-xs text-foreground">
                {value}
              </code>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function getErrorStatus(error: ApplicationError) {
  const status = readString(error.extra.status) ?? readString(error.extra.state);

  return status ?? (error.handled ? "resolved" : "unresolved");
}

function getRecordEntries(value: unknown): [string, string][] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .map(([key, entryValue]) => [key, stringifyValue(entryValue)] as const)
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
}

function getContextEntries(
  value: unknown,
  fallback: Record<string, unknown> = {},
): [string, string][] {
  return [...getRecordEntries(fallback), ...getRecordEntries(value)];
}

function getBreadcrumbs(error: ApplicationError) {
  const rawBreadcrumbs = Array.isArray(error.breadcrumbs)
    ? error.breadcrumbs
    : [];

  return rawBreadcrumbs.map((breadcrumb) => {
    const record = isRecord(breadcrumb) ? breadcrumb : {};
    const type = readString(record.type) ?? readString(record.category) ?? "log";
    const description =
      readString(record.description) ??
      readString(record.message) ??
      readString(record.event) ??
      stringifyValue(record.data) ??
      "Breadcrumb";
    const time =
      readString(record.time) ??
      readString(record.timestamp) ??
      readString(record.createdAt);

    return { type, description, time };
  });
}

function isApplicationFrame(frame: string) {
  return [
    "app/",
    "components/",
    "src/",
    "providers/",
    "lib/",
    "pages/",
  ].some((part) => frame.includes(part));
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
