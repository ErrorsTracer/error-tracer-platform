"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApplicationError,
  fetchUserApplicationErrors,
} from "@/lib/application-errors";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime, getSeverityBg } from "@/lib/mock-data";
import { cn, formatCount } from "@/lib/utils";

const PAGE_LIMIT = 25;
const ALL_APPLICATIONS = "all";

type ErrorSort = "lastOccurred" | "topRepeated";

interface ApiApplication {
  id: string;
  name: string;
}

export default function CriticalErrorsPage() {
  const [errors, setErrors] = useState<ApplicationError[]>([]);
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("critical");
  const [applicationId, setApplicationId] = useState(ALL_APPLICATIONS);
  const [sort, setSort] = useState<ErrorSort>("lastOccurred");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setAppsLoading(true);
    setAppsError(null);

    apiFetch<ApiApplication[]>("/v0.1/applications/")
      .then((data) => {
        if (active) {
          setApplications(data);
        }
      })
      .catch((error) => {
        if (active) {
          setAppsError(
            error instanceof Error
              ? error.message
              : "Unable to load applications.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setAppsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    setNextCursor(null);
    setHasNextPage(false);

    fetchUserApplicationErrors({
      limit: PAGE_LIMIT,
      level,
      applicationId: applicationId === ALL_APPLICATIONS ? null : applicationId,
      sort,
    })
      .then((page) => {
        if (active) {
          setErrors(page.errors);
          setNextCursor(page.nextCursor);
          setHasNextPage(page.hasNextPage);
        }
      })
      .catch((error) => {
        if (active) {
          setErrors([]);
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load critical errors.",
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
  }, [level, applicationId, sort]);

  async function loadMore() {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchUserApplicationErrors({
        limit: PAGE_LIMIT,
        cursor: nextCursor,
        level,
        applicationId: applicationId === ALL_APPLICATIONS ? null : applicationId,
        sort,
      });

      setErrors((current) => [...current, ...page.errors]);
      setNextCursor(page.nextCursor);
      setHasNextPage(page.hasNextPage);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load more critical errors.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const filteredErrors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return errors;
    }

    return errors.filter((error) =>
      [
        error.error,
        error.applicationName,
        error.client,
        error.runtime,
        error.level,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch)),
    );
  }, [errors, search]);

  const repeatedTotal = filteredErrors.reduce(
    (total, error) => total + error.repeated,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-red-500/10">
          <AlertTriangle className="size-4.5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Critical Errors
          </h1>
          <p className="text-sm text-muted-foreground">
            High severity issues requiring immediate attention.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Visible Groups",
            value: formatCount(filteredErrors.length),
            sub: "Matching current filters",
          },
          {
            label: "Visible Events",
            value: formatCount(repeatedTotal),
            sub: "Grouped occurrences",
          },
          {
            label: "Level",
            value: level,
            sub: "Default critical",
          },
          {
            label: "Sort",
            value: sort === "topRepeated" ? "Repeated" : "Recent",
            sub: "Cursor paginated",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold capitalize text-foreground">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search errors..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="fatal">Fatal</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={applicationId}
          onValueChange={setApplicationId}
          disabled={appsLoading}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={appsLoading ? "Loading..." : "Application"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_APPLICATIONS}>All Applications</SelectItem>
            {applications.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as ErrorSort)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastOccurred">Last Occurred</SelectItem>
            <SelectItem value="topRepeated">Top Repeated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {appsError && (
        <p className="text-xs text-muted-foreground">
          Applications could not be loaded: {appsError}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Level</TableHead>
              <TableHead className="text-xs">Error</TableHead>
              <TableHead className="text-xs">Application</TableHead>
              <TableHead className="text-xs">Client</TableHead>
              <TableHead className="text-xs">Runtime</TableHead>
              <TableHead className="text-right text-xs">Events</TableHead>
              <TableHead className="text-right text-xs">Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading errors...
                </TableCell>
              </TableRow>
            ) : filteredErrors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  No errors match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredErrors.map((error, index) => (
                <TableRow key={getErrorRowKey(error, index)} className="cursor-pointer">
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
                  <TableCell className="max-w-sm">
                    {canOpenErrorDetails(error) ? (
                      <Link href={getErrorDetailsHref(error)} className="group">
                        <span className="block truncate font-mono text-xs text-foreground group-hover:text-primary">
                          {error.error}
                        </span>
                      </Link>
                    ) : (
                      <span className="block truncate font-mono text-xs text-foreground">
                        {error.error}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {error.applicationName ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {error.client ?? "unknown"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {error.runtime ?? "unknown"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCount(error.repeated)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatRelativeTime(error.lastSeenAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function getErrorDetailsHref(error: ApplicationError) {
  const params = error.appId ? `?appId=${encodeURIComponent(error.appId)}` : "";

  return `/dashboard/errors/${error.id}${params}`;
}

function canOpenErrorDetails(error: ApplicationError) {
  return Boolean(error.id && error.appId);
}

function getErrorRowKey(error: ApplicationError, index: number) {
  return (
    error.id ||
    [
      error.error,
      error.level,
      error.appId,
      error.repeated,
      error.lastSeenAt,
      index,
    ]
      .filter(Boolean)
      .join(":")
  );
}
