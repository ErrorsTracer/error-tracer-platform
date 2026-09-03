"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatCount } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 5_000;

interface LiveErrorRateResponse {
  generatedAt: string;
  windowMinutes: number;
  points: Array<{ timestamp: string; errors: number }>;
}

interface ChartPoint {
  timestamp: string;
  time: string;
  errors: number;
}

export function LiveErrorRateChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRate = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const response = await apiFetch<LiveErrorRateResponse>(
        "/v0.1/applications/errors/live-rate",
      );
      setData(
        response.points.map((point) => ({
          ...point,
          time: formatMinute(point.timestamp),
        })),
      );
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the live error rate.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRate(true);
    const interval = window.setInterval(() => void loadRate(), REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadRate]);

  return (
    <div className="w-full rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Live Error Rate
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Errors per minute across all applications · Last 30 minutes
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-3.5 animate-spin" />
          Loading live error rate...
        </div>
      ) : error && data.length === 0 ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadRate(true)}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.25 0.005 260)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCount}
            />
            <Tooltip content={<LiveRateTooltip />} />
            <Line
              type="monotone"
              dataKey="errors"
              name="Errors/min"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function LiveRateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint; value: number }>;
}) {
  const point = payload?.[0];
  if (!active || !point) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">
        {new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date(point.payload.timestamp))}
      </p>
      <p className="mt-1 text-xs text-foreground">
        <span className="font-mono font-medium">{formatCount(point.value)}</span>{" "}
        errors/min
      </p>
    </div>
  );
}

function formatMinute(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
