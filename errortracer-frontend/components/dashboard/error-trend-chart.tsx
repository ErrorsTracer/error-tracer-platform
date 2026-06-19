"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ApplicationErrorsReport,
  fetchApplicationErrorsReport,
  fetchApplicationsErrorsReport,
} from "@/lib/application-errors";
import { formatCount } from "@/lib/utils";

interface ChartDataPoint {
  day: string;
  "This Week": number;
  "Last Week": number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs text-muted-foreground">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.dataKey}:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCount(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ErrorTrendChart({ appId }: { appId?: string }) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(shouldUpdate = () => true) {
    setLoading(true);
    setError(null);

    try {
      const report = appId
        ? await fetchApplicationErrorsReport(appId)
        : await fetchApplicationsErrorsReport();

      if (shouldUpdate()) {
        setChartData(toChartData(report));
      }
    } catch (error) {
      if (shouldUpdate()) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load weekly error report.",
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

    loadReport(() => active);

    return () => {
      active = false;
    };
  }, [appId]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Error Activity
          </h3>
          <p className="text-xs text-muted-foreground">
            Weekly error volume comparison
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-3.5 animate-spin" />
          Loading weekly report...
        </div>
      ) : error ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadReport()}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="thisWeekGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="oklch(0.72 0.1 195)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.72 0.1 195)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient
                id="lastWeekGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="oklch(0.5 0 0)"
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.5 0 0)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.25 0.005 260)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCount}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: 11, color: "oklch(0.6 0 0)" }}
            />
            <Area
              type="monotone"
              dataKey="Last Week"
              stroke="oklch(0.5 0 0)"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#lastWeekGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="This Week"
              stroke="oklch(0.72 0.1 195)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#thisWeekGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "oklch(0.72 0.1 195)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function toChartData(report: ApplicationErrorsReport): ChartDataPoint[] {
  const lastWeekByDay = new Map(
    report.lastWeek.map((item) => [item.day, item.errors]),
  );

  return report.thisWeek.map((item) => ({
    day: item.day,
    "This Week": item.errors,
    "Last Week": lastWeekByDay.get(item.day) ?? 0,
  }));
}
