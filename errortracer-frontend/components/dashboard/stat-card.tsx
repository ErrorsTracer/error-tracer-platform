import { cn, formatCount } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  description?: string
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, description }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon className="size-4 text-muted-foreground/60" />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {typeof value === "number" ? formatCount(value) : value}
        </p>
        {change && (
          <span
            className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-emerald-400",
              changeType === "negative" && "text-red-400",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
