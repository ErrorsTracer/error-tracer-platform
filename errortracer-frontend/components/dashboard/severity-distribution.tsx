"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatCount } from "@/lib/utils";

interface SeverityDistributionResponse {
  criticalErrorsCount: number;
  totalErrorsCount: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">
        <span
          className="inline-block size-2 rounded-full mr-1.5"
          style={{ backgroundColor: payload[0].payload.color }}
        />
        {payload[0].name}:{" "}
        <span className="font-mono font-medium text-foreground">
          {formatCount(payload[0].value)}
        </span>
      </p>
    </div>
  );
}

export function SeverityDistribution() {
  const [distribution, setDistribution] =
    useState<SeverityDistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadDistribution(shouldUpdate = () => true) {
    setLoading(true);
    setError(false);

    try {
      const data = await apiFetch<SeverityDistributionResponse>(
        "/v0.1/applications/errors/severity-distribution",
      );

      if (shouldUpdate()) {
        setDistribution(data);
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

    loadDistribution(() => active);

    return () => {
      active = false;
    };
  }, []);

  const criticalErrorsCount = distribution?.criticalErrorsCount ?? 0;
  const totalErrorsCount = distribution?.totalErrorsCount ?? 0;
  const otherErrorsCount = Math.max(
    0,
    totalErrorsCount - criticalErrorsCount,
  );
  const data = [
    { name: "Critical", value: criticalErrorsCount, color: "#ef4444" },
    { name: "Error", value: otherErrorsCount, color: "#f97316" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">
        Severity Distribution
      </h3>
      <p className="text-xs text-muted-foreground">Errors by severity level</p>
      {loading ? (
        <div className="mt-4 flex h-[120px] items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-3.5 animate-spin" />
          Loading distribution...
        </div>
      ) : error ? (
        <div className="mt-4 flex h-[120px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Unavailable</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadDistribution()}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-6">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={data}
                innerRadius={32}
                outerRadius={52}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2.5">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name}
                </span>
                <span className="ml-auto font-mono text-xs font-medium text-foreground">
                  {formatCount(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
