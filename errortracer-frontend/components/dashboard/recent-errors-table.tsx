"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime, getSeverityBg, mockErrors } from "@/lib/mock-data";
import {
  type ApplicationError,
  fetchApplicationRecentErrors,
} from "@/lib/application-errors";
import { cn, formatCount } from "@/lib/utils";

interface RecentErrorsTableProps {
  limit?: number;
  appId?: string;
}

export function RecentErrorsTable({
  limit = 6,
  appId,
}: RecentErrorsTableProps) {
  const [errors, setErrors] = useState<ApplicationError[]>(
    mockErrors.slice(0, limit).map(toApplicationErrorFallback),
  );
  const [loading, setLoading] = useState(Boolean(appId));
  const [error, setError] = useState<string | null>(null);

  async function loadErrors(shouldUpdate = () => true) {
    if (!appId) {
      setErrors(mockErrors.slice(0, limit).map(toApplicationErrorFallback));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApplicationRecentErrors({ appId, limit });

      if (shouldUpdate()) {
        setErrors(data.errors);
      }
    } catch (error) {
      if (shouldUpdate()) {
        setError(
          error instanceof Error ? error.message : "Unable to load errors.",
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

    loadErrors(() => active);

    return () => {
      active = false;
    };
  }, [appId, limit]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Recent Errors</h3>
          <p className="text-xs text-muted-foreground">
            {appId
              ? "Latest error events for this application"
              : "Latest error events across all applications"}
          </p>
        </div>
        <Link
          href={
            appId
              ? `/dashboard/apps/${appId}?tab=errors`
              : "/dashboard/critical"
          }
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          View all
          <ExternalLink className="size-3" />
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Level</TableHead>
            <TableHead className="text-xs">Error</TableHead>
            <TableHead className="text-xs">Client</TableHead>
            <TableHead className="text-xs">Runtime</TableHead>
            <TableHead className="text-xs text-right">Repeated</TableHead>
            <TableHead className="text-xs text-right">Last Seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-xs text-muted-foreground"
              >
                <Loader2 className="mr-2 inline size-3.5 animate-spin" />
                Loading errors...
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">{error}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadErrors()}
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : errors.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-xs text-muted-foreground"
              >
                No errors found.
              </TableCell>
            </TableRow>
          ) : (
            errors.map((error) => (
              <TableRow key={error.id} className="cursor-pointer">
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      getSeverityBg(error.level),
                    )}
                  >
                    {error.level}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={getErrorDetailsHref(error, appId)}
                    className="group flex flex-col"
                  >
                    <span className="max-w-xs truncate font-mono text-xs text-foreground group-hover:text-primary">
                      {error.error}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {error.client ?? error.framework}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {[error.runtime, error.language]
                      .filter(Boolean)
                      .join(" / ") || "unknown"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-xs text-foreground">
                    {formatCount(error.repeated)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(error.lastSeenAt)}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function toApplicationErrorFallback(
  error: (typeof mockErrors)[number],
): ApplicationError {
  return {
    id: error.id,
    appId: error.appId,
    error: error.message,
    stack: error.stack,
    framework: error.framework,
    environment: error.environment,
    language: error.language,
    runtime: error.runtime,
    level: error.severity,
    name: null,
    fingerprint: null,
    handled: null,
    timestamp: error.lastSeen,
    release: null,
    url: null,
    transaction: null,
    user: null,
    request: null,
    tags: error.tags,
    extra: {},
    breadcrumbs: null,
    contexts: null,
    additionalData: null,
    href: null,
    host: null,
    client: error.appName,
    repeated: error.occurrences,
    clientAgent: null,
    clientPlatform: null,
    createdAt: error.firstSeen,
    lastSeenAt: error.lastSeen,
  };
}

function getErrorDetailsHref(error: ApplicationError, appId?: string) {
  const applicationId = appId ?? error.appId;
  const params = applicationId
    ? `?appId=${encodeURIComponent(applicationId)}`
    : "";

  return `/dashboard/errors/${error.id}${params}`;
}
