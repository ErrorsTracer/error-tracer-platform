"use client";

import { Download, FileBarChart, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { mockApps } from "@/lib/mock-data";
import { formatCount } from "@/lib/utils";
import { toast } from "sonner";

const weeklyData = [
  { week: "W18", errors: 892 },
  { week: "W19", errors: 1045 },
  { week: "W20", errors: 978 },
  { week: "W21", errors: 1284 },
];

const criticalTrend = [
  { day: "May 10", critical: 4 },
  { day: "May 11", critical: 6 },
  { day: "May 12", critical: 3 },
  { day: "May 13", critical: 8 },
  { day: "May 14", critical: 5 },
  { day: "May 15", critical: 7 },
  { day: "May 16", critical: 4 },
];

const frameworkDist = [
  { name: "React", errors: 437 },
  { name: "NestJS", errors: 315 },
  { name: "Express", errors: 323 },
  { name: "Next.js", errors: 342 },
  { name: "Laravel", errors: 89 },
  { name: "Vue", errors: 120 },
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs text-muted-foreground">
          {p.dataKey}:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCount(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const topApps = [...mockApps]
    .sort((a, b) => b.errorsCount - a.errorsCount)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Error analytics and weekly summaries.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success("Report exported")}
        >
          <Download className="size-3.5" />
          Export Report
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total Errors (4 weeks)",
            value: formatCount(4199),
            change: "+18%",
            dir: "up",
          },
          {
            label: "Critical Rate",
            value: "1.8%",
            change: "-0.3%",
            dir: "down",
          },
          {
            label: "Avg Resolution Time",
            value: "4.2h",
            change: "+12min",
            dir: "up",
          },
          { label: "SLA Uptime", value: "99.92%", change: "", dir: "neutral" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-semibold text-foreground">
                {s.value}
              </p>
              {s.change && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${s.dir === "down" ? "text-emerald-400" : s.dir === "up" ? "text-red-400" : "text-muted-foreground"}`}
                >
                  {s.dir === "up" ? (
                    <TrendingUp className="size-3" />
                  ) : s.dir === "down" ? (
                    <TrendingDown className="size-3" />
                  ) : null}
                  {s.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Volume */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium text-foreground">
            Weekly Error Volume
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Errors per week over the last 4 weeks
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={weeklyData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.25 0.005 260)"
                vertical={false}
              />
              <XAxis
                dataKey="week"
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
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="errors"
                fill="oklch(0.72 0.1 195)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Critical Trend */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium text-foreground">
            Critical Error Trend
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Daily critical errors this week
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={criticalTrend}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
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
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="critical"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Affected Apps */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Top Affected Applications
          </h3>
          <div className="flex flex-col gap-2.5">
            {topApps.map((app) => {
              const pct = Math.round(
                (app.errorsCount / topApps[0].errorsCount) * 100,
              );
              return (
                <div key={app.id} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-foreground">
                    {app.name}
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-secondary">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right font-mono text-xs text-muted-foreground">
                    {formatCount(app.errorsCount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Framework Distribution */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium text-foreground">
            Errors by Framework
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Distribution across frameworks
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={frameworkDist}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.25 0.005 260)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCount}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="errors"
                fill="oklch(0.65 0.15 155)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SLA Placeholder */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">
          SLA & Uptime Monitoring
        </h3>
        <p className="text-xs text-muted-foreground">
          Track service level agreements and uptime metrics.
        </p>
        <div className="mt-4 flex items-center justify-center rounded-md border border-dashed border-border py-8 text-sm text-muted-foreground">
          SLA monitoring dashboard coming soon
        </div>
      </div>
    </div>
  );
}
