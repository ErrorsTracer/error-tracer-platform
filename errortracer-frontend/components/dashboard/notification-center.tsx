"use client"

import { ReactNode } from "react"
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  UserPlus,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelativeTime } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import type { UserNotification } from "./navbar"

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  notifications: UserNotification[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onMarkAsRead: (notificationId: string) => void
  onMarkAllRead: () => void
}

function getNotifIcon(type: string) {
  switch (type) {
    case "critical": return <AlertCircle className="size-4 text-red-400" />
    case "resolved": return <CheckCircle2 className="size-4 text-emerald-400" />
    case "invite": return <UserPlus className="size-4 text-blue-400" />
    case "application_invite": return <UserPlus className="size-4 text-blue-400" />
    case "system": return <Info className="size-4 text-muted-foreground" />
    default: return <Bell className="size-4 text-muted-foreground" />
  }
}

export function NotificationCenter({
  open,
  onOpenChange,
  children,
  notifications,
  loading,
  error,
  onRefresh,
  onMarkAsRead,
  onMarkAllRead,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0 || loading}
          >
            Mark all read
          </Button>
        </div>
        <ScrollArea className="h-72">
          <div className="flex flex-col">
            {loading && (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading notifications...
              </div>
            )}

            {!loading && error && (
              <div className="flex h-40 flex-col items-center justify-center gap-3 px-4 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="size-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            )}

            {!loading && !error && notifications.map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => onMarkAsRead(notif.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onMarkAsRead(notif.id)
                  }
                }}
                className={cn(
                  "flex cursor-pointer gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                  !notif.isRead && "bg-primary/5"
                )}
              >
                <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", !notif.isRead && "text-foreground")}>
                    {getNotificationTitle(notif.type)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function getNotificationTitle(type: string) {
  switch (type) {
    case "application_invite":
      return "Application invitation"
    case "critical":
      return "Critical alert"
    case "resolved":
      return "Resolved"
    case "system":
      return "System"
    default:
      return "Notification"
  }
}
