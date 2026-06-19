"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatRelativeTime, getSeverityBg } from "@/lib/mock-data";
import {
  type ApplicationError,
  fetchApplicationErrors,
} from "@/lib/application-errors";
import { cn, formatCount } from "@/lib/utils";

interface AppErrorsTabProps {
  appId: string;
}

const PAGE_SIZE = 10;

export function AppErrorsTab({ appId }: AppErrorsTabProps) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [errors, setErrors] = useState<ApplicationError[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadErrors(shouldUpdate = () => true) {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApplicationErrors({
        appId,
        limit: PAGE_SIZE,
        cursor,
        search: search.trim(),
        level,
        environment,
      });

      if (shouldUpdate()) {
        setErrors(data.errors);
        setNextCursor(data.nextCursor);
        setHasNextPage(data.hasNextPage);
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
  }, [appId, cursor, search, level, environment]);

  function resetCursor() {
    setCursor(null);
    setCursorStack([]);
  }

  function goNextPage() {
    if (!nextCursor) {
      return;
    }

    setCursorStack((previous) => [...previous, cursor]);
    setCursor(nextCursor);
  }

  function goPreviousPage() {
    setCursorStack((previous) => {
      const nextStack = previous.slice(0, -1);
      setCursor(previous[previous.length - 1] ?? null);
      return nextStack;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search errors..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetCursor();
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={level}
          onValueChange={(value) => {
            setLevel(value);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={environment}
          onValueChange={(value) => {
            setEnvironment(value);
            resetCursor();
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Level</TableHead>
              <TableHead className="text-xs">Error</TableHead>
              <TableHead className="text-xs">Framework</TableHead>
              <TableHead className="text-xs">Runtime</TableHead>
              <TableHead className="text-xs">Environment</TableHead>
              <TableHead className="text-xs text-right">Repeated</TableHead>
              <TableHead className="text-xs text-right">Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-xs text-muted-foreground"
                >
                  <Loader2 className="mr-2 inline size-3.5 animate-spin" />
                  Loading errors...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {error}
                    </span>
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
                  colSpan={7}
                  className="h-32 text-center text-xs text-muted-foreground"
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
                  <TableCell className="max-w-xs">
                    <Link
                      href={`/dashboard/errors/${error.id}?appId=${encodeURIComponent(appId)}`}
                      className="group"
                    >
                      <span className="block truncate font-mono text-xs text-foreground group-hover:text-primary">
                        {error.error}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {error.framework}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {[error.runtime, error.language]
                        .filter(Boolean)
                        .join(" / ") || "unknown"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {error.environment}
                    </span>
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

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goPreviousPage}
          disabled={loading || cursorStack.length === 0}
        >
          <ChevronLeft className="size-3.5" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goNextPage}
          disabled={loading || !hasNextPage || !nextCursor}
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
